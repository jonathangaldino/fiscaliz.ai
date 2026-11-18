/**
 * Automation in numbers (issue #54): what the bot did without manual triage.
 * Public, aggregates only. Seed occurrences are left out so the numbers are
 * real; seed occurrences have no reports.
 */
import { v } from "convex/values";
import { query } from "./_generated/server";
import { percentile } from "./addressMetrics";

// shortcut: aggregates in memory over the latest rows, fine for thousands of
// reports; move to counters (or @convex-dev/aggregate) past this size.
const MAX_ROWS = 10_000;

const nullableNumber = v.union(v.number(), v.null());

export const summary = query({
  args: {},
  returns: v.object({
    reports: v.number(),
    occurrences: v.number(),
    // Occurrences with an agency: every category except "other".
    routed: v.number(),
    verifying: v.number(),
    resolved: v.number(),
    diversions: v.array(
      v.object({
        kind: v.union(v.literal("emergency"), v.literal("out_of_scope")),
        target: v.string(),
        count: v.number(),
      }),
    ),
    // Milliseconds from the first message to the report. Reports before #54 have no start.
    timeToMap: v.object({ count: v.number(), p50: nullableNumber, p95: nullableNumber }),
    agencies: v.array(
      v.object({
        slug: v.string(),
        name: v.string(),
        open: v.number(),
        resolved: v.number(),
        appeal: v.number(),
      }),
    ),
  }),
  handler: async (ctx) => {
    const [all, reports, counters, agencies] = await Promise.all([
      ctx.db.query("occurrences").order("desc").take(MAX_ROWS),
      ctx.db.query("reports").order("desc").take(MAX_ROWS),
      ctx.db.query("anonymousCounters").order("desc").take(MAX_ROWS),
      ctx.db.query("agencies").collect(),
    ]);
    const occurrences = all.filter((o) => o.source !== "seed");

    const diversions = new Map<string, { kind: "emergency" | "out_of_scope"; target: string; count: number }>();
    for (const { kind, target } of counters) {
      const key = `${kind}:${target}`;
      const row = diversions.get(key) ?? { kind, target, count: 0 };
      row.count += 1;
      diversions.set(key, row);
    }

    const durations = reports.flatMap((r) =>
      r.startedAt === undefined ? [] : [r.createdAt - r.startedAt],
    );

    return {
      reports: reports.length,
      occurrences: occurrences.length,
      routed: occurrences.filter((o) => o.agencyId !== undefined).length,
      verifying: occurrences.filter((o) => o.status === "verifying").length,
      resolved: occurrences.filter((o) => o.status === "resolved").length,
      diversions: [...diversions.values()].sort((a, b) => b.count - a.count),
      timeToMap: {
        count: durations.length,
        p50: percentile(durations, 0.5),
        p95: percentile(durations, 0.95),
      },
      agencies: agencies
        .map(({ _id, slug, name }) => {
          const mine = occurrences.filter((o) => o.agencyId === _id);
          return {
            slug,
            name,
            open: mine.filter((o) => o.status !== "resolved").length,
            resolved: mine.filter((o) => o.status === "resolved").length,
            appeal: mine.reduce((sum, o) => sum + o.appeal, 0),
          };
        })
        .sort((a, b) => b.appeal - a.appeal),
    };
  },
});
