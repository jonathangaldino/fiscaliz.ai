/**
 * Address reliability (issue #37): how the street match does with real
 * citizens, by medium (text or audio) and by source. Public functions return
 * counts only; the address text never leaves through them.
 */
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalQuery, query } from "./_generated/server";

export const GROUPS = ["cnefe_exact", "cnefe_typo_1", "cnefe_typo_2", "google", "none"] as const;
type Group = (typeof GROUPS)[number];
const MEDIUMS = ["text", "audio"] as const;

// shortcut: aggregates in memory over the latest rows, fine for hundreds of
// messages; move to counters (or @convex-dev/aggregate) past this size.
const MAX_ROWS = 10_000;

function group(attempt: Doc<"geocodeAttempts">): Group {
  return attempt.source === "cnefe_typo"
    ? attempt.typoDistance >= 2 ? "cnefe_typo_2" : "cnefe_typo_1"
    : attempt.source;
}

/** Nearest-rank percentile; null when there is no sample. */
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
}

const nullableNumber = v.union(v.number(), v.null());
const rowValidator = v.object({
  medium: v.union(v.literal("text"), v.literal("audio")),
  group: v.union(...GROUPS.map((g) => v.literal(g))),
  count: v.number(),
  ambiguous: v.number(),
  // Attempts with an outcome; the base for confirmed and corrected.
  closed: v.number(),
  confirmed: v.number(),
  correctedPin: v.number(),
  correctedText: v.number(),
  errorP50: nullableNumber,
  errorP95: nullableNumber,
  msP50: nullableNumber,
  msP95: nullableNumber,
});

export function summarize(attempts: Doc<"geocodeAttempts">[]) {
  return MEDIUMS.flatMap((medium) =>
    GROUPS.map((g) => {
      const rows = attempts.filter((a) => a.medium === medium && group(a) === g);
      const errors = rows.flatMap((a) => (a.errorMeters === undefined ? [] : [a.errorMeters]));
      const ms = rows.map((a) => a.ms);
      const count = (outcome: Doc<"geocodeAttempts">["outcome"]) =>
        rows.filter((a) => a.outcome === outcome).length;
      return {
        medium,
        group: g,
        count: rows.length,
        ambiguous: rows.filter((a) => a.ambiguous).length,
        closed: rows.filter((a) => a.outcome !== undefined).length,
        confirmed: count("confirmed"),
        correctedPin: count("corrected_pin"),
        correctedText: count("corrected_text"),
        errorP50: percentile(errors, 0.5),
        errorP95: percentile(errors, 0.95),
        msP50: percentile(ms, 0.5),
        msP95: percentile(ms, 0.95),
      };
    }),
  );
}

export const summary = query({
  args: {},
  returns: v.array(rowValidator),
  handler: async (ctx) =>
    summarize(await ctx.db.query("geocodeAttempts").order("desc").take(MAX_ROWS)),
});

/**
 * Address texts that failed or were ambiguous, most frequent first. Internal:
 * `npx convex run addressMetrics:failedQueries`.
 */
export const failedQueries = internalQuery({
  args: {},
  returns: v.array(v.object({ query: v.string(), count: v.number() })),
  handler: async (ctx) => {
    const attempts = await ctx.db.query("geocodeAttempts").order("desc").take(MAX_ROWS);
    const counts = new Map<string, number>();
    for (const { query } of attempts) {
      if (query) counts.set(query, (counts.get(query) ?? 0) + 1);
    }
    return [...counts]
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count);
  },
});
