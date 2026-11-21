import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { MAX_PHOTO_BYTES } from "./bot/photo";
import { parseVerifyButton } from "./lib/verification";
import { buttonValidator } from "./validators";

// Random UUID generated in the browser. Not personal data.
const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const MAX_TEXT_LENGTH = 1000;

function assertSession(sessionId: string) {
  if (!SESSION_ID.test(sessionId)) throw new ConvexError("Sessão inválida");
}

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Step 1 of a photo: the browser POSTs the file here, then calls `send`. */
export const generatePhotoUploadUrl = mutation({
  args: { sessionId: v.string() },
  returns: v.string(),
  handler: async (ctx, { sessionId }) => {
    assertSession(sessionId);
    // shortcut: an upload never followed by `send` stays in storage; add a
    // sweep of unreferenced files if the public simulator gets abused.
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Checks type and size. An invalid upload is deleted and the bot explains, as
 * a message: throwing would roll the delete back.
 */
async function acceptPhoto(
  ctx: MutationCtx,
  sessionId: string,
  storageId: Id<"_storage">,
): Promise<boolean> {
  const file = await ctx.db.system.get(storageId);
  if (!file) throw new ConvexError("Foto não encontrada");
  // A published photo must never become someone's draft (it would be deleted).
  const published = await ctx.db
    .query("occurrences")
    .withIndex("by_photo", (q) => q.eq("photo.storageId", storageId))
    .first();
  if (published) throw new ConvexError("Foto inválida");
  if (PHOTO_TYPES.includes(file.contentType ?? "") && file.size <= MAX_PHOTO_BYTES) {
    return true;
  }
  await ctx.storage.delete(storageId);
  await ctx.db.insert("simulatorMessages", {
    sessionId,
    author: "bot",
    text: "Essa foto não serve: envie uma imagem JPEG, PNG ou WebP de até 5 MB.",
    createdAt: Date.now(),
  });
  return false;
}

/** The citizen side of the simulator: what Telegram would deliver. */
export const send = mutation({
  args: {
    sessionId: v.string(),
    text: v.optional(v.string()),
    location: v.optional(v.object({ lat: v.number(), lng: v.number() })),
    // "yes" / "no", or a verification button id.
    button: v.optional(v.string()),
    // From generatePhotoUploadUrl; `text` is its caption.
    photoStorageId: v.optional(v.id("_storage")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertSession(args.sessionId);
    const text = args.text?.trim().slice(0, MAX_TEXT_LENGTH) || undefined;
    if (!text && !args.location && !args.button && !args.photoStorageId) {
      throw new ConvexError("Mensagem vazia");
    }
    if (
      args.photoStorageId &&
      !(await acceptPhoto(ctx, args.sessionId, args.photoStorageId))
    ) {
      return null;
    }

    const decision =
      args.button === "yes" || args.button === "no" ? args.button : undefined;
    const verification = parseVerifyButton(args.button);
    if (args.button && !decision && !verification) {
      throw new ConvexError("Botão inválido");
    }

    const now = Date.now();
    await ctx.db.insert("simulatorMessages", {
      sessionId: args.sessionId,
      author: "citizen",
      text:
        (args.photoStorageId ? `📷 Foto${text ? `: ${text}` : ""}` : text) ??
        (verification
          ? verification.answer === "yes"
            ? "SIM, resolvido"
            : "NÃO, continua"
          : decision === "yes"
            ? "SIM"
            : decision === "no"
              ? "NÃO"
              : "📍 Local marcado no mapa"),
      createdAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.bot.handleIncoming.handleIncoming, {
      message: {
        channel: "simulator",
        externalId: args.sessionId,
        receivedAt: now,
        text,
        location: args.location,
        button: decision,
        verification: verification ?? undefined,
        photo: args.photoStorageId ? { storageId: args.photoStorageId } : undefined,
      },
    });
    return null;
  },
});

export const messages = query({
  args: { sessionId: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("simulatorMessages"),
      author: v.union(v.literal("citizen"), v.literal("bot")),
      text: v.string(),
      buttons: v.optional(v.array(buttonValidator)),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, { sessionId }) => {
    assertSession(sessionId);
    const docs = await ctx.db
      .query("simulatorMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
    return docs.map(({ _id, author, text, buttons, createdAt }) => ({
      _id,
      author,
      text,
      buttons,
      createdAt,
    }));
  },
});
