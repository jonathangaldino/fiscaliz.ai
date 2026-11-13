import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";
import { modules } from "../test.setup";
import type { Extraction } from "./types";

const SESSION = "6f1c1a8e-3b7a-4c5e-9d1f-2a3b4c5d6e7f";
const NOW = Date.parse("2026-11-20T15:00:00-03:00");

const problem: Extraction = {
  kind: "urban",
  emergencyTarget: null,
  outOfScopeTarget: null,
  category: "street_lighting",
  description: "O poste da frente de casa está apagado faz uma semana",
  address: null,
  occurredAt: null,
  publicSummary: "Poste apagado há uma semana.",
};

const pin = {
  lat: -23.5580,
  lng: -51.4500,
  address: "Rua Exemplo, 500",
  precise: true,
};

async function setup() {
  const t = convexTest(schema, modules);
  await t.mutation(internal.seed.run, {});
  const citizenId = await t.mutation(internal.bot.conversations.ensureCitizen, {
    channel: "simulator",
    externalIdHash: "hash-1",
  });
  return { t, citizenId };
}

type T = Awaited<ReturnType<typeof setup>>["t"];

async function step(
  t: T,
  citizenId: Id<"citizens">,
  input: {
    extraction?: Extraction | null;
    location?: typeof pin | null;
    decision?: "yes" | "no" | null;
  },
) {
  const { version } = await t.query(internal.bot.conversations.load, { citizenId });
  return t.mutation(internal.bot.conversations.applyStep, {
    citizenId,
    channel: "simulator",
    expectedVersion: version,
    receivedAt: NOW,
    extraction: input.extraction ?? null,
    location: input.location ?? null,
    decision: input.decision ?? null,
  });
}

const reportCount = (t: T) =>
  t.run(async (ctx) => (await ctx.db.query("reports").collect()).length);

describe("applyStep", () => {
  it("collects, confirms and registers a report end to end", async () => {
    const { t, citizenId } = await setup();
    const before = (await t.query(api.occurrences.listOpen, {})).length;

    const first = await step(t, citizenId, { extraction: problem });
    expect(first.ok && first.messages[0].text).toMatch(/Onde fica/);

    const second = await step(t, citizenId, { location: pin });
    expect(second.ok && second.messages[0].text).toMatch(/Confere o relato/);

    const third = await step(t, citizenId, { decision: "yes" });
    if (!third.ok) throw new Error("expected ok");
    expect(third.messages[0].text).toMatch(/Relato registrado/);
    expect(third.messages[0].text).toMatch(/Idepplan/);
    expect(third.messages[0].text).toMatch(
      /https:\/\/fiscaliza\.test\/ocorrencias\//,
    );

    const open = await t.query(api.occurrences.listOpen, {});
    expect(open).toHaveLength(before + 1);
    const created = open.find((o) => o.source === "simulator");
    expect(created).toMatchObject({
      category: "street_lighting",
      agencySlug: "idepplan",
      appeal: 1,
      summary: "Poste apagado há uma semana.",
    });

    expect(await reportCount(t)).toBe(1);
    const { state } = await t.query(internal.bot.conversations.load, { citizenId });
    expect(state).toBeNull();
  });

  it("goes back to collecting on NÃO without registering", async () => {
    const { t, citizenId } = await setup();
    await step(t, citizenId, { extraction: problem, location: pin });
    const result = await step(t, citizenId, { decision: "no" });
    expect(result.ok && result.messages[0].text).toMatch(/corrigido/);
    const { state } = await t.query(internal.bot.conversations.load, { citizenId });
    expect(state?.phase).toBe("collecting");
    expect(await reportCount(t)).toBe(0);
  });

  it("registers only once when two confirmations arrive together", async () => {
    const { t, citizenId } = await setup();
    await step(t, citizenId, { extraction: problem, location: pin });
    const { version } = await t.query(internal.bot.conversations.load, { citizenId });

    const confirm = () =>
      t.mutation(internal.bot.conversations.applyStep, {
        citizenId,
        channel: "simulator",
        expectedVersion: version,
        receivedAt: NOW,
        extraction: null,
        location: null,
        decision: "yes",
      });
    const results = await Promise.all([confirm(), confirm()]);

    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok)).toEqual([{ ok: false, reason: "stale" }]);
    expect(await reportCount(t)).toBe(1);
  });
});

describe("handleIncoming", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("ANTHROPIC_API_KEY", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("asks to try again and stores nothing when the AI fails", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.simulator.send, {
      sessionId: SESSION,
      text: "tem um buraco na minha rua",
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const chat = await t.query(api.simulator.messages, { sessionId: SESSION });
    expect(chat.map((m) => m.author)).toEqual(["citizen", "bot"]);
    expect(chat[1].text).toMatch(/mandar de novo/);

    const stored = await t.run(async (ctx) => ({
      conversations: (await ctx.db.query("conversations").collect()).length,
      reports: (await ctx.db.query("reports").collect()).length,
    }));
    expect(stored).toEqual({ conversations: 0, reports: 0 });
  });

  it("handles a pin without calling the AI", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.simulator.send, {
      sessionId: SESSION,
      location: { lat: pin.lat, lng: pin.lng },
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const chat = await t.query(api.simulator.messages, { sessionId: SESSION });
    expect(chat[1].text).toMatch(/Qual é o problema/);
  });
});

describe("simulator.send", () => {
  it("rejects an invalid session id", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.simulator.send, { sessionId: "nope", text: "oi" }),
    ).rejects.toThrow();
  });
});

describe("anonymous counters", () => {
  it("stores only kind, target and time for an emergency", async () => {
    const { t, citizenId } = await setup();
    await step(t, citizenId, { extraction: problem });
    const result = await step(t, citizenId, {
      extraction: {
        ...problem,
        kind: "emergency",
        emergencyTarget: "samu",
        category: null,
        publicSummary: null,
      },
    });
    expect(result.ok && result.messages[0].text).toMatch(/192/);

    const stored = await t.run(async (ctx) => ({
      counters: await ctx.db.query("anonymousCounters").collect(),
      conversations: await ctx.db.query("conversations").collect(),
      reports: await ctx.db.query("reports").collect(),
    }));
    expect(stored.conversations).toHaveLength(0);
    expect(stored.reports).toHaveLength(0);
    expect(stored.counters).toHaveLength(1);
    const { _id, _creationTime, ...fields } = stored.counters[0];
    expect(_id && _creationTime).toBeTruthy();
    expect(Object.keys(fields).sort()).toEqual(["createdAt", "kind", "target"]);
    expect(fields).toMatchObject({ kind: "emergency", target: "samu" });
  });
});

describe("limits and expiry", () => {
  async function registerOne(t: T, citizenId: Id<"citizens">) {
    await step(t, citizenId, { extraction: problem, location: pin });
    return step(t, citizenId, { decision: "yes" });
  }

  it("accepts 5 reports a day and refuses the 6th", async () => {
    const { t, citizenId } = await setup();
    for (let i = 0; i < 5; i++) {
      const result = await registerOne(t, citizenId);
      expect(result.ok && result.messages[0].text).toMatch(/Relato registrado/);
    }
    const sixth = await step(t, citizenId, { extraction: problem, location: pin });
    expect(sixth.ok && sixth.messages[0].text).toMatch(/limite diário/);
    expect(await reportCount(t)).toBe(5);
  });

  it("counts the limit per citizen", async () => {
    const { t, citizenId } = await setup();
    for (let i = 0; i < 5; i++) await registerOne(t, citizenId);
    const other = await t.mutation(internal.bot.conversations.ensureCitizen, {
      channel: "simulator",
      externalIdHash: "hash-2",
    });
    const result = await registerOne(t, other);
    expect(result.ok && result.messages[0].text).toMatch(/Relato registrado/);
  });

  it("expires conversations idle for 30 minutes without registering", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(NOW);
      const { t, citizenId } = await setup();
      await step(t, citizenId, { extraction: problem, location: pin });

      vi.setSystemTime(NOW + 29 * 60 * 1000);
      expect(await t.mutation(internal.bot.conversations.expire, {})).toBe(0);

      vi.setSystemTime(NOW + 31 * 60 * 1000);
      expect(await t.mutation(internal.bot.conversations.expire, {})).toBe(1);

      const { state } = await t.query(internal.bot.conversations.load, { citizenId });
      expect(state).toBeNull();
      expect(await reportCount(t)).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("de-duplication and appeal", () => {
  async function confirm(
    t: T,
    citizenId: Id<"citizens">,
    extraction: Extraction,
    location: typeof pin,
    pickMatch: boolean,
  ) {
    await step(t, citizenId, { extraction, location });
    const candidates = await t.query(internal.bot.dedup.candidates, {
      category: extraction.category!,
      lat: location.lat,
      lng: location.lng,
      precise: location.precise,
    });
    // Stands in for the AI: picks the nearest candidate when asked to.
    const matchId = pickMatch ? (candidates[0]?.id ?? null) : null;
    const { version } = await t.query(internal.bot.conversations.load, { citizenId });
    const result = await t.mutation(internal.bot.conversations.applyStep, {
      citizenId,
      channel: "simulator",
      expectedVersion: version,
      receivedAt: NOW,
      extraction: null,
      location: null,
      decision: "yes",
      matchId,
    });
    return { result, candidates };
  }

  const newCitizen = (t: T, hash: string) =>
    t.mutation(internal.bot.conversations.ensureCitizen, {
      channel: "simulator",
      externalIdHash: hash,
    });

  const simulatorOccurrences = async (t: T) =>
    (await t.query(api.occurrences.listOpen, {})).filter((o) => o.source === "simulator");

  it("adds appeal when a second citizen reports the same problem", async () => {
    const { t, citizenId } = await setup();
    await confirm(t, citizenId, problem, pin, true);

    const other = await newCitizen(t, "hash-2");
    const nearby = { ...pin, lat: pin.lat + 0.0001 }; // ~11 m away
    const { result, candidates } = await confirm(t, other, problem, nearby, true);

    expect(candidates).toHaveLength(1);
    expect(result.ok && result.messages[0].text).toMatch(/agora são 2 pessoas/);
    const list = await simulatorOccurrences(t);
    expect(list).toHaveLength(1);
    expect(list[0].appeal).toBe(2);
    expect(await reportCount(t)).toBe(2);
  });

  it("does not add appeal when the same citizen reports again", async () => {
    const { t, citizenId } = await setup();
    await confirm(t, citizenId, problem, pin, true);
    const { result } = await confirm(t, citizenId, problem, pin, true);

    expect(result.ok && result.messages[0].text).toMatch(/Você já relatou/);
    const list = await simulatorOccurrences(t);
    expect(list).toHaveLength(1);
    expect(list[0].appeal).toBe(1);
    expect(await reportCount(t)).toBe(1);
  });

  it("opens a new occurrence for a different category at the same spot", async () => {
    const { t, citizenId } = await setup();
    await confirm(t, citizenId, problem, pin, true);
    const other = await newCitizen(t, "hash-2");
    const drainage: Extraction = {
      ...problem,
      category: "drainage",
      publicSummary: "Bueiro entupido.",
    };
    const { candidates } = await confirm(t, other, drainage, pin, true);

    expect(candidates).toHaveLength(0);
    expect(await simulatorOccurrences(t)).toHaveLength(2);
  });

  it("opens a new occurrence outside the radius", async () => {
    const { t, citizenId } = await setup();
    await confirm(t, citizenId, problem, pin, true);
    const other = await newCitizen(t, "hash-2");
    const far = { ...pin, lat: pin.lat + 0.001 }; // ~110 m, beyond 50 m
    const { candidates } = await confirm(t, other, problem, far, true);

    expect(candidates).toHaveLength(0);
    expect(await simulatorOccurrences(t)).toHaveLength(2);
  });

  it("uses the wider radius when only the street is known", async () => {
    const { t, citizenId } = await setup();
    await confirm(t, citizenId, problem, pin, true);
    const other = await newCitizen(t, "hash-2");
    const street = { ...pin, lat: pin.lat + 0.001, precise: false }; // ~110 m
    const { candidates } = await confirm(t, other, problem, street, true);
    expect(candidates).toHaveLength(1);
  });

  it("opens a new occurrence when the AI says it is a different problem", async () => {
    const { t, citizenId } = await setup();
    await confirm(t, citizenId, problem, pin, true);
    const other = await newCitizen(t, "hash-2");
    await confirm(t, other, problem, pin, false);
    expect(await simulatorOccurrences(t)).toHaveLength(2);
  });

  it("re-validates the match: a resolved occurrence gets no appeal", async () => {
    const { t, citizenId } = await setup();
    await confirm(t, citizenId, problem, pin, true);
    const [first] = await simulatorOccurrences(t);

    const other = await newCitizen(t, "hash-2");
    await step(t, other, { extraction: problem, location: pin });
    await t.run((ctx) => ctx.db.patch(first._id, { status: "resolved" }));
    const { version } = await t.query(internal.bot.conversations.load, { citizenId: other });
    const result = await t.mutation(internal.bot.conversations.applyStep, {
      citizenId: other,
      channel: "simulator",
      expectedVersion: version,
      receivedAt: NOW,
      extraction: null,
      location: null,
      decision: "yes",
      matchId: first._id,
    });

    expect(result.ok && result.messages[0].text).toMatch(/Relato registrado/);
    const open = await simulatorOccurrences(t);
    expect(open).toHaveLength(1);
    expect(open[0]._id).not.toBe(first._id);
  });
});
