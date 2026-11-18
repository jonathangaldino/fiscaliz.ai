import { convexTest } from "convex-test";
import { expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

it("counts real reports, routing, diversions and time to map, without the seed", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(internal.seed.run, {});
  await t.run(async (ctx) => {
    const agency = await ctx.db
      .query("agencies")
      .withIndex("by_slug", (q) => q.eq("slug", "servicos-publicos"))
      .unique();
    const base = { lat: -23.55, lng: -51.46, address: "Rua Exemplo", summary: "x", openedAt: 0 };
    const routed = await ctx.db.insert("occurrences", {
      ...base,
      category: "pavement",
      agencyId: agency!._id,
      status: "resolved",
      appeal: 2,
      source: "whatsapp",
    });
    await ctx.db.insert("occurrences", {
      ...base,
      category: "other",
      status: "open",
      appeal: 1,
      source: "simulator",
    });
    for (const [i, startedAt] of [[0, 1_000], [1, undefined], [2, 3_000]] as const) {
      const citizenId = await ctx.db.insert("citizens", {
        channel: "simulator",
        externalIdHash: `h${i}`,
      });
      await ctx.db.insert("reports", {
        occurrenceId: routed,
        citizenId,
        description: "d",
        occurredAt: 0,
        createdAt: 10_000,
        startedAt,
      });
    }
    for (const target of ["samu", "samu", "copel"]) {
      await ctx.db.insert("anonymousCounters", {
        kind: target === "copel" ? "out_of_scope" : "emergency",
        target,
        createdAt: 0,
      });
    }
  });

  const m = await t.query(api.metrics.summary, {});
  expect(m).toMatchObject({ reports: 3, occurrences: 2, routed: 1, verifying: 0, resolved: 1 });
  expect(m.diversions).toEqual([
    { kind: "emergency", target: "samu", count: 2 },
    { kind: "out_of_scope", target: "copel", count: 1 },
  ]);
  expect(m.timeToMap).toEqual({ count: 2, p50: 7_000, p95: 9_000 });
  expect(m.agencies.find((a) => a.slug === "servicos-publicos")).toMatchObject({
    open: 0,
    resolved: 1,
    appeal: 2,
  });
  expect(m.agencies.reduce((sum, a) => sum + a.appeal, 0)).toBe(2);
});
