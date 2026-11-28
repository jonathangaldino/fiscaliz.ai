/**
 * Furniture pickup (ADR 0011). A pickup request is not a report: it gets a
 * Fiscaliz.ai protocol, joins the waiting point at the same street + number,
 * and leaves the map on the first "yes, collected" or after 15 days.
 */
import { v, type Infer } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
  type MutationCtx,
} from "./_generated/server";
import * as messages from "./bot/messages";
import { sendTelegram } from "./bot/channels/telegram";
import type { CompletePickupDraft } from "./bot/types";
import {
  brasiliaYear,
  findPickupPoint,
  formatProtocol,
  mergeItems,
  pickupDue,
} from "./lib/pickup";
import { verifyButtonId } from "./lib/verification";
import { pickupItemValidator } from "./validators";

export type PickupResult =
  | { kind: "created" | "joined"; pointId: Id<"pickupPoints">; protocol: string }
  | { kind: "already_requested"; pointId: Id<"pickupPoints">; protocol: string };

// shortcut: scans every waiting point in memory; fine for one city's volume,
// add a geo index if it ever grows past a few thousand.
async function waitingPoints(ctx: MutationCtx) {
  return ctx.db
    .query("pickupPoints")
    .withIndex("by_status", (q) => q.eq("status", "waiting"))
    .collect();
}

async function nextProtocol(ctx: MutationCtx, now: number): Promise<string> {
  const year = brasiliaYear(now);
  const counter = await ctx.db
    .query("protocolCounters")
    .withIndex("by_year", (q) => q.eq("year", year))
    .unique();
  const last = (counter?.last ?? 0) + 1;
  if (counter) await ctx.db.patch(counter._id, { last });
  else await ctx.db.insert("protocolCounters", { year, last });
  return formatProtocol(last, year);
}

/** Runs inside applyStep, so a failure never leaves half a request. */
export async function registerPickup(
  ctx: MutationCtx,
  args: {
    citizenId: Id<"citizens">;
    draft: CompletePickupDraft;
    source: "telegram" | "whatsapp" | "simulator";
    now: number;
  },
): Promise<PickupResult> {
  const { draft, citizenId, now } = args;
  const point = findPickupPoint(await waitingPoints(ctx), draft);

  if (point) {
    const existing = await ctx.db
      .query("pickupRequests")
      .withIndex("by_point_citizen", (q) =>
        q.eq("pointId", point._id).eq("citizenId", citizenId),
      )
      .first();
    if (existing) {
      return { kind: "already_requested", pointId: point._id, protocol: existing.protocol };
    }
  }

  let pointId: Id<"pickupPoints">;
  if (point) {
    pointId = point._id;
    await ctx.db.patch(point._id, {
      requests: point.requests + 1,
      items: mergeItems(point.items, draft.items),
    });
  } else {
    pointId = await ctx.db.insert("pickupPoints", {
      status: "waiting",
      lat: draft.lat,
      lng: draft.lng,
      address: draft.address,
      addressKey: draft.addressKey,
      items: draft.items,
      requests: 1,
      openedAt: now,
      source: args.source,
    });
  }
  const protocol = await nextProtocol(ctx, now);
  await ctx.db.insert("pickupRequests", {
    pointId,
    citizenId,
    protocol,
    complement: draft.complement,
    description: draft.description,
    items: draft.items,
    createdAt: now,
  });
  return { kind: point ? "joined" : "created", pointId, protocol };
}

/** What the browser sees: never the protocol, the complement or the citizen's text. */
export const publicPickupPointValidator = v.object({
  _id: v.id("pickupPoints"),
  lat: v.number(),
  lng: v.number(),
  address: v.string(),
  items: v.array(pickupItemValidator),
  requests: v.number(),
  openedAt: v.number(),
  photoUrl: v.optional(v.string()),
});

export type PublicPickupPoint = Infer<typeof publicPickupPointValidator>;

/** Waiting points, for the map layer and the Serviços Públicos page. */
export const listWaiting = query({
  args: {},
  returns: v.array(publicPickupPointValidator),
  handler: async (ctx) => {
    const points = await ctx.db
      .query("pickupPoints")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .order("desc")
      .take(1000);
    return Promise.all(
      points.map(async (p) => ({
        _id: p._id,
        lat: p.lat,
        lng: p.lng,
        address: p.address,
        items: p.items,
        requests: p.requests,
        openedAt: p.openedAt,
        photoUrl:
          p.photo?.status === "ready"
            ? ((await ctx.storage.getUrl(p.photo.storageId)) ?? undefined)
            : undefined,
      })),
    );
  },
});

/** Hourly: asks after 3 days, expires after 15. */
export const sweep = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    for (const point of await waitingPoints(ctx)) {
      // Demo points have nobody to ask and stay on the map, like seed occurrences.
      if (point.source === "seed") continue;
      const due = pickupDue(point, now);
      if (due === "ask") {
        await ctx.db.patch(point._id, { askedAt: now });
      } else if (due === "expire") {
        await ctx.db.patch(point._id, { status: "expired", closedAt: now });
      }
      if (due) {
        await ctx.scheduler.runAfter(0, internal.pickups.notify, {
          pointId: point._id,
          kind: due,
        });
      }
    }
    return null;
  },
});

export const recipients = internalQuery({
  args: { pointId: v.id("pickupPoints") },
  returns: v.object({
    address: v.string(),
    citizens: v.array(
      v.object({
        telegramChatId: v.optional(v.string()),
        sessionId: v.optional(v.string()),
      }),
    ),
  }),
  handler: async (ctx, { pointId }) => {
    const point = await ctx.db.get(pointId);
    if (!point) throw new Error("Pickup point not found");
    const requests = await ctx.db
      .query("pickupRequests")
      .withIndex("by_point_citizen", (q) => q.eq("pointId", pointId))
      .take(500);
    const citizens = await Promise.all(
      [...new Set(requests.map((r) => r.citizenId))].map((id) => ctx.db.get(id)),
    );
    return {
      address: point.address,
      citizens: citizens
        .filter((c): c is Doc<"citizens"> => c !== null)
        .map(({ telegramChatId, sessionId }) => ({ telegramChatId, sessionId })),
    };
  },
});

/** Sends the question or the expiry notice. One failure does not stop the rest. */
export const notify = internalAction({
  args: { pointId: v.id("pickupPoints"), kind: v.union(v.literal("ask"), v.literal("expire")) },
  returns: v.null(),
  handler: async (ctx, { pointId, kind }) => {
    const { address, citizens } = await ctx.runQuery(internal.pickups.recipients, { pointId });
    // Same button format as the occurrence verification; vote tells them apart by table.
    const message =
      kind === "ask"
        ? messages.pickupQuestion(
            { address },
            { yes: verifyButtonId(pointId, "yes"), no: verifyButtonId(pointId, "no") },
          )
        : messages.pickupExpired(address);
    for (const citizen of citizens) {
      try {
        if (citizen.telegramChatId) {
          await sendTelegram(citizen.telegramChatId, [message]);
        } else if (citizen.sessionId) {
          await ctx.runMutation(internal.bot.channels.simulator.deliver, {
            sessionId: citizen.sessionId,
            messages: [message],
          });
        }
      } catch (error) {
        console.error("Pickup notice failed", error);
      }
    }
    return null;
  },
});

/** A requester's answer: the first "yes" collects the point. */
export async function answerPickup(
  ctx: MutationCtx,
  pointId: Id<"pickupPoints">,
  citizenId: Id<"citizens">,
  answer: "yes" | "no",
) {
  const point = await ctx.db.get(pointId);
  const request = await ctx.db
    .query("pickupRequests")
    .withIndex("by_point_citizen", (q) => q.eq("pointId", pointId).eq("citizenId", citizenId))
    .first();
  if (point?.status !== "waiting" || !request) return messages.verificationClosed();
  if (answer === "no") return messages.pickupStillWaiting();
  await ctx.db.patch(pointId, { status: "collected", closedAt: Date.now() });
  return messages.pickupCollected();
}
