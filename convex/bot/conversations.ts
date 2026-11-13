/**
 * Database side of the bot. Everything here is internal: personal data never
 * leaves through a public function.
 */
import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { agencyForCategory } from "../lib/categories";
import { startOfDayInBrasilia } from "../lib/time";
import {
  channelValidator,
  conversationStateValidator,
  outgoingMessageValidator,
} from "../validators";
import * as messages from "./messages";
import { registerReport } from "./register";
import { DAILY_REPORT_LIMIT, nextStep } from "./stateMachine";
import { extractionSchema, type ResolvedLocation } from "./types";

export const ensureCitizen = internalMutation({
  args: {
    channel: channelValidator,
    externalIdHash: v.string(),
    phone: v.optional(v.string()),
  },
  returns: v.id("citizens"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("citizens")
      .withIndex("by_channel_hash", (q) =>
        q.eq("channel", args.channel).eq("externalIdHash", args.externalIdHash),
      )
      .unique();
    if (existing) return existing._id;
    return await ctx.db.insert("citizens", args);
  },
});

export const load = internalQuery({
  args: { citizenId: v.id("citizens") },
  returns: v.object({
    state: v.union(conversationStateValidator, v.null()),
    version: v.number(),
  }),
  handler: async (ctx, { citizenId }) => {
    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_citizen", (q) => q.eq("citizenId", citizenId))
      .unique();
    return conversation
      ? { state: conversation.state, version: conversation.version }
      : { state: null, version: 0 };
  },
});

/**
 * Runs the state machine and stores the result atomically. Refuses to write
 * if the conversation changed since the action read it (`expectedVersion`),
 * so two messages arriving together never register a report twice.
 */
export const applyStep = internalMutation({
  args: {
    citizenId: v.id("citizens"),
    channel: channelValidator,
    expectedVersion: v.number(),
    receivedAt: v.number(),
    // Validated by Zod in the action; stored nowhere as-is.
    extraction: v.union(v.any(), v.null()),
    location: v.union(
      v.object({
        lat: v.number(),
        lng: v.number(),
        address: v.string(),
        precise: v.boolean(),
      }),
      v.null(),
    ),
    decision: v.union(v.literal("yes"), v.literal("no"), v.null()),
    addressNotFound: v.optional(v.boolean()),
  },
  returns: v.union(
    v.object({ ok: v.literal(true), messages: v.array(outgoingMessageValidator) }),
    v.object({ ok: v.literal(false), reason: v.literal("stale") }),
  ),
  handler: async (ctx, args) => {
    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_citizen", (q) => q.eq("citizenId", args.citizenId))
      .unique();
    const version = conversation?.version ?? 0;
    if (version !== args.expectedVersion) {
      return { ok: false as const, reason: "stale" as const };
    }

    const now = Date.now();
    const todaysReports = await ctx.db
      .query("reports")
      .withIndex("by_citizen_createdAt", (q) =>
        q
          .eq("citizenId", args.citizenId)
          .gte("createdAt", startOfDayInBrasilia(now)),
      )
      .take(DAILY_REPORT_LIMIT);
    const step = nextStep(conversation?.state ?? null, {
      reportsToday: todaysReports.length,
      receivedAt: args.receivedAt,
      extraction: extractionSchema.nullable().parse(args.extraction),
      location: args.location as ResolvedLocation | null,
      decision: args.decision,
      addressNotFound: args.addressNotFound ?? false,
    });

    if (step.type === "register") {
      const result = await registerReport(ctx, {
        citizenId: args.citizenId,
        draft: step.draft,
        source: args.channel,
        now,
      });
      // The conversation ends here.
      if (conversation) await ctx.db.delete(conversation._id);
      const link = messages.occurrenceLink(
        process.env.PUBLIC_APP_URL ?? "",
        result.occurrenceId,
      );
      return {
        ok: true as const,
        messages: [
          messages.registered(link, agencyForCategory(step.draft.category)),
        ],
      };
    }

    if (step.counter) {
      await ctx.db.insert("anonymousCounters", {
        kind: step.counter.kind,
        target: step.counter.target,
        createdAt: now,
      });
    }

    if (step.state === null) {
      if (conversation) await ctx.db.delete(conversation._id);
    } else if (conversation) {
      await ctx.db.patch(conversation._id, {
        state: step.state,
        version: version + 1,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("conversations", {
        citizenId: args.citizenId,
        state: step.state,
        version: 1,
        updatedAt: now,
      });
    }
    return { ok: true as const, messages: step.messages };
  },
});

export const CONVERSATION_TTL_MS = 30 * 60 * 1000;

/** Deletes idle conversations. An expired conversation never becomes a report. */
export const expire = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const cutoff = Date.now() - CONVERSATION_TTL_MS;
    const stale = await ctx.db
      .query("conversations")
      .withIndex("by_updatedAt", (q) => q.lt("updatedAt", cutoff))
      .take(500);
    for (const conversation of stale) await ctx.db.delete(conversation._id);
    return stale.length;
  },
});
