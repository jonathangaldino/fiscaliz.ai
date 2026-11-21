/**
 * Report photos (ADR 0010). The original never reaches the panel: on SIM the
 * occurrence is marked "processing", the Modal worker blurs faces and plates,
 * and only the blurred copy is stored. The original is deleted either way.
 */
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
  type ActionCtx,
  type MutationCtx,
} from "../_generated/server";
import { draftPhotoValidator } from "../validators";
import { send } from "./channels";
import * as messages from "./messages";
import type { RegisterResult } from "./register";
import { downloadTelegramFile } from "./transcribe";
import type { DraftPhoto } from "./types";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const BLUR_TIMEOUT_MS = 90_000;
const BLUR_ATTEMPTS = 2;

/** Deletes the simulator uploads in `photos` that are not `keep`. Telegram files are not ours. */
export async function discardPhotos(
  ctx: MutationCtx,
  photos: (DraftPhoto | undefined)[],
  keep?: DraftPhoto,
): Promise<void> {
  const kept = keep && "storageId" in keep ? keep.storageId : null;
  const ids = new Set(
    photos.flatMap((p) => (p && "storageId" in p ? [p.storageId] : [])),
  );
  for (const id of ids) {
    if (id !== kept && (await ctx.db.system.get(id))) await ctx.storage.delete(id);
  }
}

/**
 * Called on SIM. The occurrence shows only its first photo (ADR 0010): if it
 * already has one, or one is being processed, this photo is dropped.
 * Returns whether the photo went to anonymization.
 */
export async function claimPhoto(
  ctx: MutationCtx,
  result: RegisterResult,
  photo: DraftPhoto,
  citizenId: Id<"citizens">,
): Promise<boolean> {
  const occurrence =
    result.kind === "already_reported" ? null : await ctx.db.get(result.occurrenceId);
  if (!occurrence || occurrence.photo) {
    await discardPhotos(ctx, [photo]);
    return false;
  }
  await ctx.db.patch(occurrence._id, { photo: { status: "processing" } });
  await ctx.scheduler.runAfter(0, internal.bot.photo.anonymize, {
    occurrenceId: occurrence._id,
    citizenId,
    photo,
  });
  return true;
}

/** Drops a photo whose message failed before applyStep stored it anywhere. */
export const discard = internalMutation({
  args: { photo: draftPhotoValidator },
  returns: v.null(),
  handler: async (ctx, { photo }) => {
    await discardPhotos(ctx, [photo]);
    return null;
  },
});

export const anonymize = internalAction({
  args: {
    occurrenceId: v.id("occurrences"),
    citizenId: v.id("citizens"),
    photo: draftPhotoValidator,
  },
  returns: v.null(),
  handler: async (ctx, { occurrenceId, citizenId, photo }) => {
    let originalId: Id<"_storage"> | null = null;
    let blurredId: Id<"_storage"> | null = null;
    try {
      originalId =
        "storageId" in photo
          ? photo.storageId
          : await storeTelegramPhoto(ctx, photo.telegramFileId);
      blurredId = await blur(ctx, originalId);
    } catch (error) {
      console.error("Photo anonymization failed", error);
    } finally {
      // The original is never kept, whatever happened.
      if (originalId) {
        await ctx.storage
          .delete(originalId)
          .catch((error) => console.error("Original photo delete failed", error));
      }
    }

    const published = await ctx.runMutation(internal.bot.photo.finish, {
      occurrenceId,
      storageId: blurredId,
    });
    const recipient = await ctx.runQuery(internal.bot.photo.recipient, { citizenId });
    if (!recipient) return null;
    const link = messages.occurrenceLink(process.env.PUBLIC_APP_URL ?? "", occurrenceId);
    await send(ctx, recipient, [
      published ? messages.photoPublished(link) : messages.photoFailed(),
    ]);
    return null;
  },
});

/** Telegram hosts the original; copy it to storage so Modal never sees the bot token. */
async function storeTelegramPhoto(
  ctx: ActionCtx,
  fileId: string,
): Promise<Id<"_storage">> {
  const { data } = await downloadTelegramFile(fileId, MAX_PHOTO_BYTES);
  // Telegram re-encodes every `photo` as JPEG; the file endpoint answers octet-stream.
  return await ctx.storage.store(new Blob([data], { type: "image/jpeg" }));
}

/** Modal fetches the original by URL and uploads the blurred JPEG itself. */
async function blur(ctx: ActionCtx, originalId: Id<"_storage">): Promise<Id<"_storage">> {
  const url = process.env.MODAL_BLUR_URL;
  const secret = process.env.MODAL_BLUR_SECRET;
  if (!url || !secret) throw new Error("MODAL_BLUR_URL / MODAL_BLUR_SECRET not set");
  const imageUrl = await ctx.storage.getUrl(originalId);
  if (!imageUrl) throw new Error("Original photo is gone");

  let lastError: unknown;
  for (let attempt = 0; attempt < BLUR_ATTEMPTS; attempt++) {
    try {
      // Upload URLs are single use: a fresh one per attempt.
      const uploadUrl = await ctx.storage.generateUploadUrl();
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image_url: imageUrl, upload_url: uploadUrl }),
        signal: AbortSignal.timeout(BLUR_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`Blur failed: HTTP ${response.status}`);
      const { storageId } = (await response.json()) as { storageId?: unknown };
      if (typeof storageId !== "string") throw new Error("Blur returned no storageId");
      return storageId as Id<"_storage">;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

/**
 * Publishes the blurred copy, or clears the "processing" mark on failure.
 * Returns whether the photo is now on the panel.
 */
export const finish = internalMutation({
  args: {
    occurrenceId: v.id("occurrences"),
    storageId: v.union(v.id("_storage"), v.null()),
  },
  returns: v.boolean(),
  handler: async (ctx, { occurrenceId, storageId }) => {
    const occurrence = await ctx.db.get(occurrenceId);
    const file = storageId ? await ctx.db.system.get(storageId) : null;
    const isImage = file?.contentType?.startsWith("image/") ?? false;
    if (occurrence?.photo?.status === "processing" && file && isImage) {
      await ctx.db.patch(occurrenceId, { photo: { status: "ready", storageId: file._id } });
      return true;
    }
    if (occurrence?.photo?.status === "processing") {
      await ctx.db.patch(occurrenceId, { photo: undefined });
    }
    if (file) await ctx.storage.delete(file._id);
    return false;
  },
});

export const recipient = internalQuery({
  args: { citizenId: v.id("citizens") },
  returns: v.union(
    v.object({
      channel: v.union(v.literal("telegram"), v.literal("simulator")),
      externalId: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, { citizenId }) => {
    const citizen = await ctx.db.get(citizenId);
    if (citizen?.telegramChatId) {
      return { channel: "telegram" as const, externalId: citizen.telegramChatId };
    }
    if (citizen?.sessionId) {
      return { channel: "simulator" as const, externalId: citizen.sessionId };
    }
    return null;
  },
});
