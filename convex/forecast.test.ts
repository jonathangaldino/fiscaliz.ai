import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

const SESSION = "6f1c1a8e-3b7a-4c5e-9d1f-2a3b4c5d6e70";
const NOW = Date.parse("2026-11-28T10:00:00-03:00");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

/** The seed queue plus one pothole on an avenue, reported in the simulator. */
async function setup() {
  const t = convexTest(schema, modules);
  await t.mutation(internal.seed.run, {});
  const ids = await t.run(async (ctx) => {
    const agency = await ctx.db
      .query("agencies")
      .withIndex("by_slug", (q) => q.eq("slug", "servicos-publicos"))
      .unique();
    const occurrenceId = await ctx.db.insert("occurrences", {
      category: "pavement",
      agencyId: agency!._id,
      status: "open",
      lat: -23.55,
      lng: -51.46,
      address: "Avenida Exemplo, 10",
      summary: "Buraco no asfalto.",
      appeal: 40,
      openedAt: NOW - 9 * 24 * 60 * 60 * 1000,
      source: "simulator",
    });
    const citizenId = await ctx.db.insert("citizens", {
      channel: "simulator",
      externalIdHash: "hash",
      sessionId: SESSION,
    });
    await ctx.db.insert("reports", {
      occurrenceId,
      citizenId,
      description: "buraco",
      occurredAt: NOW,
      createdAt: NOW,
    });
    const all = await ctx.db.query("occurrences").collect();
    return {
      occurrenceId,
      ruralRoadId: all.find((o) => o.category === "rural_roads")!._id,
      otherId: all.find((o) => o.category === "other")!._id,
    };
  });
  return { t, ...ids };
}

describe("forecast.estimate", () => {
  it("places the occurrence in its agency queue and gives a window", async () => {
    const { t, occurrenceId } = await setup();
    const estimate = await t.query(api.forecast.estimate, { id: occurrenceId });
    // Old pothole on an avenue with high appeal: first in line. R$ 1,200 of
    // R$ 15,000 a month is 2.4 days of work, so the answer is a week.
    expect(estimate).toMatchObject({
      status: "funded",
      fiscalYear: 2026,
      position: 1,
      queueSize: 11,
      window: { precision: "week", start: Date.parse("2026-11-30T00:00:00-03:00") },
    });
  });

  it("gives no window to what does not fit this year's budget", async () => {
    const { t, ruralRoadId } = await setup();
    const estimate = await t.query(api.forecast.estimate, { id: ruralRoadId });
    expect(estimate?.status).toBe("over_budget");
    expect(estimate?.window).toBeUndefined();
  });

  it("returns null without an agency or for an unknown id", async () => {
    const { t, otherId } = await setup();
    expect(await t.query(api.forecast.estimate, { id: otherId })).toBeNull();
    expect(await t.query(api.forecast.estimate, { id: "nope" })).toBeNull();
  });
});

describe("forecast.commit", () => {
  it("publishes the window and tells who reported", async () => {
    const { t, occurrenceId } = await setup();
    expect((await t.query(api.occurrences.get, { id: occurrenceId }))?.forecast).toBe(
      undefined,
    );

    await t.mutation(api.forecast.commit, { id: occurrenceId });
    // The notification is scheduled with runAfter(0).
    vi.advanceTimersByTime(1);
    await t.finishInProgressScheduledFunctions();

    const occurrence = await t.query(api.occurrences.get, { id: occurrenceId });
    expect(occurrence?.forecast).toMatchObject({
      precision: "week",
      committedAt: expect.any(Number),
    });

    const sent = await t.run((ctx) =>
      ctx.db
        .query("simulatorMessages")
        .withIndex("by_session", (q) => q.eq("sessionId", SESSION))
        .collect(),
    );
    expect(sent).toHaveLength(1);
    expect(sent[0].text).toContain("Previsão de atendimento: na semana de 30/11.");
    expect(sent[0].text).toContain("https://fiscaliza.test/ocorrencias/");
  });

  it("keeps the committed window when the queue changes later", async () => {
    const { t, occurrenceId } = await setup();
    await t.mutation(api.forecast.commit, { id: occurrenceId });
    const committed = (await t.query(api.occurrences.get, { id: occurrenceId }))!
      .forecast;
    vi.setSystemTime(NOW + 20 * 24 * 60 * 60 * 1000);
    expect((await t.query(api.occurrences.get, { id: occurrenceId }))!.forecast).toEqual(
      committed,
    );
  });

  it("refuses a second commit, an unfunded occurrence and a closed one", async () => {
    const { t, occurrenceId, ruralRoadId } = await setup();
    await t.mutation(api.forecast.commit, { id: occurrenceId });
    await expect(t.mutation(api.forecast.commit, { id: occurrenceId })).rejects.toThrow(
      /já tem uma previsão/,
    );
    await expect(t.mutation(api.forecast.commit, { id: ruralRoadId })).rejects.toThrow(
      /não cabe no orçamento/,
    );
    await t.run((ctx) => ctx.db.patch(ruralRoadId, { status: "resolved", resolvedAt: NOW }));
    await expect(t.mutation(api.forecast.commit, { id: ruralRoadId })).rejects.toThrow(
      /aberta/,
    );
  });
});
