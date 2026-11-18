/**
 * V2: verification of an occurrence. Any visitor starts it from the occurrence
 * page (demo only); the bot asks every citizen with a report there whether the
 * problem was solved, and the answers move the occurrence to resolved or back
 * to open. Rules in lib/verification.
 */
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import * as messages from "./bot/messages";
import { sendVerificationTemplate } from "./bot/channels/whatsapp";
import {
  VERIFICATION_TIMEOUT_MS,
  verificationAvailableAt,
  verificationOutcome,
  verifyButtonId,
} from "./lib/verification";

// shortcut: scans at most this many reports per occurrence; paginate if an
// occurrence ever gets more citizens than that.
const MAX_REPORTS = 500;

// Feature flag: WhatsApp citizens are asked only when the Convex env sets this
// to "true" (off until Meta approves the `occurrence_verification` template).
const whatsappEnabled = () => process.env.VERIFICATION_WHATSAPP_ENABLED === "true";

/** Citizens with a report on the occurrence that the bot can message. */
async function recipientsOf(ctx: QueryCtx, occurrenceId: Id<"occurrences">) {
  const reports = await ctx.db
    .query("reports")
    .withIndex("by_occurrence_citizen", (q) => q.eq("occurrenceId", occurrenceId))
    .take(MAX_REPORTS);
  const citizenIds = [...new Set(reports.map((r) => r.citizenId))];
  const citizens = await Promise.all(citizenIds.map((id) => ctx.db.get(id)));
  return citizens.filter(
    (c): c is Doc<"citizens"> =>
      c !== null && Boolean(c.sessionId || (whatsappEnabled() && c.phone)),
  );
}

/** Whether the "start verification" button shows, and when it unlocks. */
export const availability = query({
  args: { id: v.string() },
  returns: v.union(
    v.null(),
    v.object({ canStart: v.boolean(), availableAt: v.number() }),
  ),
  handler: async (ctx, { id }) => {
    const occurrenceId = ctx.db.normalizeId("occurrences", id);
    const occurrence = occurrenceId ? await ctx.db.get(occurrenceId) : null;
    if (!occurrence || occurrence.status !== "open") return null;
    // Seed occurrences have nobody to ask: no button.
    if ((await recipientsOf(ctx, occurrence._id)).length === 0) return null;
    const availableAt = verificationAvailableAt(occurrence.reopenedAt);
    return { canStart: Date.now() >= availableAt, availableAt };
  },
});

export const start = mutation({
  args: { id: v.string() },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const occurrenceId = ctx.db.normalizeId("occurrences", id);
    const occurrence = occurrenceId ? await ctx.db.get(occurrenceId) : null;
    if (!occurrence) throw new ConvexError("Ocorrência não encontrada.");
    if (occurrence.status !== "open") {
      throw new ConvexError("Só uma ocorrência aberta pode ser verificada.");
    }
    const now = Date.now();
    if (now < verificationAvailableAt(occurrence.reopenedAt)) {
      throw new ConvexError(
        "Esta ocorrência foi verificada há pouco. Tente de novo depois de 7 dias.",
      );
    }
    if ((await recipientsOf(ctx, occurrence._id)).length === 0) {
      throw new ConvexError("Ninguém que relatou esta ocorrência pode ser consultado.");
    }

    await ctx.db.patch(occurrence._id, {
      status: "verifying",
      verificationStartedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.verification.notify, {
      occurrenceId: occurrence._id,
    });
    await ctx.scheduler.runAfter(VERIFICATION_TIMEOUT_MS, internal.verification.expire, {
      occurrenceId: occurrence._id,
      startedAt: now,
    });
    return null;
  },
});

export const recipients = internalQuery({
  args: { occurrenceId: v.id("occurrences") },
  returns: v.object({
    summary: v.string(),
    address: v.string(),
    citizens: v.array(
      v.object({ phone: v.optional(v.string()), sessionId: v.optional(v.string()) }),
    ),
  }),
  handler: async (ctx, { occurrenceId }) => {
    const occurrence = await ctx.db.get(occurrenceId);
    if (!occurrence) throw new Error("Occurrence not found");
    const citizens = await recipientsOf(ctx, occurrenceId);
    return {
      summary: occurrence.summary,
      address: occurrence.address,
      citizens: citizens.map(({ phone, sessionId }) => ({
        phone: whatsappEnabled() ? phone : undefined,
        sessionId,
      })),
    };
  },
});

/** Sends the question to every citizen. One failure does not stop the rest. */
export const notify = internalAction({
  args: { occurrenceId: v.id("occurrences") },
  returns: v.null(),
  handler: async (ctx, { occurrenceId }) => {
    const { summary, address, citizens } = await ctx.runQuery(
      internal.verification.recipients,
      { occurrenceId },
    );
    const buttons = {
      yes: verifyButtonId(occurrenceId, "yes"),
      no: verifyButtonId(occurrenceId, "no"),
    };
    const link = messages.occurrenceLink(process.env.PUBLIC_APP_URL ?? "", occurrenceId);
    let failed = 0;
    for (const citizen of citizens) {
      try {
        if (citizen.phone) {
          await sendVerificationTemplate(
            citizen.phone,
            { id: occurrenceId, summary, address },
            buttons,
          );
        } else if (citizen.sessionId) {
          await ctx.runMutation(internal.bot.channels.simulator.deliver, {
            sessionId: citizen.sessionId,
            messages: [messages.verificationQuestion({ summary, address }, link, buttons)],
          });
        }
      } catch (error) {
        failed++;
        console.error("Verification send failed", error);
      }
    }
    if (failed > 0) console.warn(`Verification: ${failed}/${citizens.length} sends failed`);
    return null;
  },
});

async function endRound(
  ctx: MutationCtx,
  occurrenceId: Id<"occurrences">,
  outcome: "resolved" | "open",
) {
  const now = Date.now();
  await ctx.db.patch(
    occurrenceId,
    outcome === "resolved"
      ? { status: "resolved", resolvedAt: now }
      : { status: "open", reopenedAt: now },
  );
  const votes = await ctx.db
    .query("verificationVotes")
    .withIndex("by_occurrence_citizen", (q) => q.eq("occurrenceId", occurrenceId))
    .take(MAX_REPORTS);
  for (const vote of votes) await ctx.db.delete(vote._id);
}

/** A citizen's answer. Returns the reply to send back. */
export const vote = internalMutation({
  args: {
    citizenId: v.id("citizens"),
    occurrenceId: v.string(),
    answer: v.union(v.literal("yes"), v.literal("no")),
  },
  returns: v.object({ text: v.string() }),
  handler: async (ctx, args) => {
    const occurrenceId = ctx.db.normalizeId("occurrences", args.occurrenceId);
    const occurrence = occurrenceId ? await ctx.db.get(occurrenceId) : null;
    if (!occurrence || occurrence.status !== "verifying") {
      return messages.verificationClosed();
    }
    // Only citizens with a report here may answer.
    const report = await ctx.db
      .query("reports")
      .withIndex("by_occurrence_citizen", (q) =>
        q.eq("occurrenceId", occurrence._id).eq("citizenId", args.citizenId),
      )
      .first();
    if (!report) return messages.verificationClosed();

    const existing = await ctx.db
      .query("verificationVotes")
      .withIndex("by_occurrence_citizen", (q) =>
        q.eq("occurrenceId", occurrence._id).eq("citizenId", args.citizenId),
      )
      .unique();
    // One vote per citizen; a second tap changes it.
    if (existing) {
      await ctx.db.patch(existing._id, { answer: args.answer });
    } else {
      await ctx.db.insert("verificationVotes", {
        occurrenceId: occurrence._id,
        citizenId: args.citizenId,
        answer: args.answer,
        createdAt: Date.now(),
      });
    }

    const votes = await ctx.db
      .query("verificationVotes")
      .withIndex("by_occurrence_citizen", (q) => q.eq("occurrenceId", occurrence._id))
      .take(MAX_REPORTS);
    const tally = {
      yes: votes.filter((vote) => vote.answer === "yes").length,
      no: votes.filter((vote) => vote.answer === "no").length,
    };
    const outcome = verificationOutcome(tally, occurrence.appeal);
    if (!outcome) return messages.verificationCounted();

    await endRound(ctx, occurrence._id, outcome);
    const link = messages.occurrenceLink(process.env.PUBLIC_APP_URL ?? "", occurrence._id);
    return outcome === "resolved"
      ? messages.verificationResolved(link)
      : messages.verificationReopened(link);
  },
});

/** 48 h without reaching 30% YES: back to open. */
export const expire = internalMutation({
  args: { occurrenceId: v.id("occurrences"), startedAt: v.number() },
  returns: v.null(),
  handler: async (ctx, { occurrenceId, startedAt }) => {
    const occurrence = await ctx.db.get(occurrenceId);
    // A later round has its own timer.
    if (
      occurrence?.status === "verifying" &&
      occurrence.verificationStartedAt === startedAt
    ) {
      await endRound(ctx, occurrenceId, "open");
    }
    return null;
  },
});
