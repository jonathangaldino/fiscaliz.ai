/**
 * Forecast of an occurrence (ADR 0012). The estimate comes from the agency's
 * queue and weekly capacity (lib/forecast) and is for the agency. Citizens
 * only see a forecast after the agency commits to it: the window is stored on
 * the occurrence and the bot tells everyone with a report there.
 *
 * Like the verification, the commit button is open to any visitor (demo only).
 */
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
  internalAction,
  mutation,
  query,
  type QueryCtx,
} from "./_generated/server";
import * as messages from "./bot/messages";
import { sendTelegram } from "./bot/channels/telegram";
import { CATEGORIES } from "./lib/categories";
import {
  WEEKLY_CAPACITY,
  describeWindow,
  planQueue,
  type ForecastWindow,
} from "./lib/forecast";
import { forecastWindowValidator } from "./validators";

// Same cap as the agency queue on the panel.
const QUEUE_LIMIT = 1000;

type Estimate = {
  window: ForecastWindow;
  /** 1-based position in the agency queue, by priority. */
  position: number;
  queueSize: number;
};

/** Where the occurrence stands in its agency's queue, or null if it has none. */
async function estimateFor(
  ctx: QueryCtx,
  occurrence: Doc<"occurrences">,
  now: number,
): Promise<Estimate | null> {
  const slug = CATEGORIES[occurrence.category].agency;
  const agencyId = occurrence.agencyId;
  if (!slug || !agencyId || occurrence.status === "resolved") return null;

  const byStatus = await Promise.all(
    (["open", "verifying"] as const).map((status) =>
      ctx.db
        .query("occurrences")
        .withIndex("by_agency_status", (q) =>
          q.eq("agencyId", agencyId).eq("status", status),
        )
        .take(QUEUE_LIMIT),
    ),
  );
  const rows = planQueue(byStatus.flat(), WEEKLY_CAPACITY[slug], now);
  const index = rows.findIndex((row) => row.item._id === occurrence._id);
  const window = rows[index]?.window;
  if (!window) return null;
  return { window, position: index + 1, queueSize: rows.length };
}

/** The agency-side estimate shown next to the "commit" button. */
export const estimate = query({
  args: { id: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      window: forecastWindowValidator,
      position: v.number(),
      queueSize: v.number(),
    }),
  ),
  handler: async (ctx, { id }) => {
    const occurrenceId = ctx.db.normalizeId("occurrences", id);
    const occurrence = occurrenceId ? await ctx.db.get(occurrenceId) : null;
    return occurrence ? estimateFor(ctx, occurrence, Date.now()) : null;
  },
});

/** The agency commits to the current estimate: it becomes public. */
export const commit = mutation({
  args: { id: v.string() },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const occurrenceId = ctx.db.normalizeId("occurrences", id);
    const occurrence = occurrenceId ? await ctx.db.get(occurrenceId) : null;
    if (!occurrence) throw new ConvexError("Ocorrência não encontrada.");
    if (occurrence.status !== "open") {
      throw new ConvexError("Só uma ocorrência aberta pode receber previsão.");
    }
    if (occurrence.forecast) {
      throw new ConvexError("Esta ocorrência já tem uma previsão assumida.");
    }
    const now = Date.now();
    const current = await estimateFor(ctx, occurrence, now);
    if (!current) {
      throw new ConvexError("Não há estimativa para esta ocorrência.");
    }

    await ctx.db.patch(occurrence._id, {
      forecast: { ...current.window, committedAt: now },
    });
    await ctx.scheduler.runAfter(0, internal.forecast.notify, {
      occurrenceId: occurrence._id,
      window: current.window,
    });
    return null;
  },
});

/** Tells every citizen with a report there. One failure does not stop the rest. */
export const notify = internalAction({
  args: { occurrenceId: v.id("occurrences"), window: forecastWindowValidator },
  returns: v.null(),
  handler: async (ctx, { occurrenceId, window }) => {
    const { summary, address, citizens } = await ctx.runQuery(
      internal.verification.recipients,
      { occurrenceId },
    );
    const link = messages.occurrenceLink(process.env.PUBLIC_APP_URL ?? "", occurrenceId);
    const message = messages.forecastCommitted(
      { summary, address },
      describeWindow(window),
      link,
    );
    let failed = 0;
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
        failed++;
        console.error("Forecast send failed", error);
      }
    }
    if (failed > 0) console.warn(`Forecast: ${failed}/${citizens.length} sends failed`);
    return null;
  },
});
