import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { Extraction, ResolvedLocation } from "./bot/types";
import { PICKUP_ASK_AFTER_MS, PICKUP_EXPIRE_AFTER_MS } from "./lib/pickup";
import { verifyButtonId } from "./lib/verification";
import schema from "./schema";
import { modules } from "./test.setup";

const NOW = Date.parse("2026-11-20T15:00:00-03:00");

const pickup = (overrides: Partial<Extraction> = {}): Extraction => ({
  kind: "pickup",
  emergencyTarget: null,
  outOfScopeTarget: null,
  pickupItems: ["sofa"],
  complement: null,
  category: null,
  description: "Quero descartar um sofá velho",
  address: null,
  occurredAt: null,
  publicSummary: null,
  ...overrides,
});

// What handleIncoming builds from a typed address with a number.
const at = (number: number, lat: number): ResolvedLocation => ({
  lat,
  lng: -51.45,
  address: `Rua Exemplo, ${number}`,
  precise: true,
  addressKey: `rua exemplo ${number}`,
});

async function setup() {
  const t = convexTest(schema, modules);
  const citizen = (hash: string) =>
    t.mutation(internal.bot.conversations.ensureCitizen, {
      channel: "simulator",
      externalIdHash: hash,
      sessionId: `session-${hash}`,
    });
  return { t, citizen };
}

type T = Awaited<ReturnType<typeof setup>>["t"];

async function step(
  t: T,
  citizenId: Id<"citizens">,
  input: { extraction?: Extraction | null; location?: ResolvedLocation | null; decision?: "yes" | "no" },
) {
  const { version } = await t.query(internal.bot.conversations.load, { citizenId });
  const result = await t.mutation(internal.bot.conversations.applyStep, {
    citizenId,
    channel: "simulator",
    expectedVersion: version,
    receivedAt: NOW,
    extraction: input.extraction ?? null,
    location: input.location ?? null,
    decision: input.decision ?? null,
  });
  if (!result.ok) throw new Error("stale");
  return result.messages.map((m) => m.text).join("\n");
}

/** Full conversation: items + address, then SIM. Returns the last reply. */
async function request(t: T, citizenId: Id<"citizens">, location: ResolvedLocation, complement?: string) {
  await step(t, citizenId, { extraction: pickup({ complement: complement ?? null }), location });
  return step(t, citizenId, { decision: "yes" });
}

describe("pickup requests", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it("asks for the address, then the number, then confirms", async () => {
    const { t, citizen } = await setup();
    const id = await citizen("a");
    expect(await step(t, id, { extraction: pickup() })).toMatch(/endereço/);
    const streetOnly = { lat: -23.55, lng: -51.45, address: "Rua Exemplo", precise: false };
    expect(await step(t, id, { location: streetOnly })).toMatch(/preciso do número/);
    expect(await step(t, id, { location: at(60, -23.55) })).toMatch(/Confere o pedido/);
    const reply = await step(t, id, { decision: "yes" });
    expect(reply).toMatch(/protocolo Fiscaliz\.ai é o 00001\/2026/);
    expect(reply).toMatch(/não é um protocolo oficial/);
  });

  it("groups apartments of the same number, keeps neighbouring numbers apart", async () => {
    const { t, citizen } = await setup();
    expect(await request(t, await citizen("a"), at(60, -23.55), "apto 300")).toMatch(/00001\/2026/);
    expect(await request(t, await citizen("b"), at(60, -23.55), "apto 500")).toMatch(/00002\/2026/);
    // 90 and 100 sit a few meters apart: still two stops.
    await request(t, await citizen("c"), at(90, -23.5501));
    await request(t, await citizen("d"), at(100, -23.55011));

    const points = await t.query(api.pickups.listWaiting, {});
    expect(points.map((p) => [p.address, p.requests]).sort()).toEqual([
      ["Rua Exemplo, 100", 1],
      ["Rua Exemplo, 60", 2],
      ["Rua Exemplo, 90", 1],
    ]);
  });

  it("gives the same citizen the protocol they already have", async () => {
    const { t, citizen } = await setup();
    const id = await citizen("a");
    await request(t, id, at(60, -23.55));
    expect(await request(t, id, at(60, -23.55))).toMatch(/continua o 00001\/2026/);
    const [point] = await t.query(api.pickups.listWaiting, {});
    expect(point.requests).toBe(1);
  });

  it("refuses debris without registering, only an anonymous counter", async () => {
    const { t, citizen } = await setup();
    const id = await citizen("a");
    expect(await step(t, id, { extraction: pickup({ kind: "pickup_refused" }) })).toMatch(
      /não recolhe/,
    );
    const counters = await t.run((ctx) => ctx.db.query("anonymousCounters").collect());
    expect(counters).toMatchObject([{ kind: "pickup_refused", target: "debris" }]);
    expect(await t.query(api.pickups.listWaiting, {})).toEqual([]);
  });

  it("never exposes the protocol, the complement or the citizen's text", async () => {
    const { t, citizen } = await setup();
    await request(t, await citizen("a"), at(60, -23.55), "apto 300");
    const json = JSON.stringify(await t.query(api.pickups.listWaiting, {}));
    expect(json).not.toMatch(/\/2026|apto|descartar/);
  });

  it("asks after 3 days; the first yes collects the point", async () => {
    const { t, citizen } = await setup();
    const id = await citizen("a");
    await request(t, id, at(60, -23.55));
    const [point] = await t.query(api.pickups.listWaiting, {});

    vi.setSystemTime(NOW + PICKUP_ASK_AFTER_MS + 1000);
    await t.mutation(internal.pickups.sweep, {});
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const inbox = await t.run((ctx) => ctx.db.query("simulatorMessages").collect());
    expect(inbox.at(-1)?.buttons?.[0].id).toBe(verifyButtonId(point._id, "yes"));

    const reply = await t.mutation(internal.verification.vote, {
      citizenId: id,
      occurrenceId: point._id,
      answer: "yes",
    });
    expect(reply.text).toMatch(/saiu do mapa/);
    expect(await t.query(api.pickups.listWaiting, {})).toEqual([]);
  });

  it("expires after 15 days and tells the requester", async () => {
    const { t, citizen } = await setup();
    await request(t, await citizen("a"), at(60, -23.55));

    vi.setSystemTime(NOW + PICKUP_EXPIRE_AFTER_MS + 1000);
    await t.mutation(internal.pickups.sweep, {});
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(await t.query(api.pickups.listWaiting, {})).toEqual([]);
    const inbox = await t.run((ctx) => ctx.db.query("simulatorMessages").collect());
    expect(inbox.at(-1)?.text).toMatch(/15 dias/);

    // A new request at the same address opens a new point.
    await request(t, await citizen("b"), at(60, -23.55));
    expect(await t.query(api.pickups.listWaiting, {})).toHaveLength(1);
  });
});
