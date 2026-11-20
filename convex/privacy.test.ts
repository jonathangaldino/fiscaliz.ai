import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

// Synthetic personal data that must never reach the browser.
const CHAT_ID = "987654321";
const HASH = "citizen-hash-abc";
const DESCRIPTION = "Moro no número 123, meu nome é Fulano, o buraco fica em frente";
const ADDRESS_QUERY = "Rua do Fulano, casa da minha sogra";

async function setup() {
  const t = convexTest(schema, modules);
  await t.mutation(internal.seed.run, {});
  const ids = await t.run(async (ctx) => {
    const agency = await ctx.db
      .query("agencies")
      .withIndex("by_slug", (q) => q.eq("slug", "servicos-publicos"))
      .unique();
    const citizenId = await ctx.db.insert("citizens", {
      channel: "telegram",
      externalIdHash: HASH,
      telegramChatId: CHAT_ID,
    });
    const occurrenceId = await ctx.db.insert("occurrences", {
      category: "pavement",
      agencyId: agency!._id,
      status: "open",
      lat: -23.55,
      lng: -51.46,
      address: "Rua Exemplo",
      summary: "Buraco no asfalto.",
      appeal: 100,
      openedAt: Date.now(),
      source: "telegram",
    });
    await ctx.db.insert("reports", {
      occurrenceId,
      citizenId,
      description: DESCRIPTION,
      occurredAt: Date.now(),
      createdAt: Date.now(),
    });
    await ctx.db.insert("geocodeAttempts", {
      citizenId,
      medium: "audio",
      source: "none",
      typoDistance: 0,
      ambiguous: false,
      ms: 5,
      query: ADDRESS_QUERY,
      createdAt: Date.now(),
    });
    return { occurrenceId, citizenId };
  });
  return { t, ...ids };
}

describe("public queries never expose personal data", () => {
  it("leaves out chat ids, citizen ids and report descriptions", async () => {
    const { t, occurrenceId, citizenId } = await setup();
    const results = await Promise.all([
      t.query(api.occurrences.listActive, {}),
      t.query(api.occurrences.listResolved, {}),
      t.query(api.occurrences.get, { id: occurrenceId }),
      t.query(api.verification.availability, { id: occurrenceId }),
      t.query(api.occurrences.listByAgency, { slug: "servicos-publicos" }),
      t.query(api.agencies.list, {}),
      t.query(api.agencies.getBySlug, { slug: "servicos-publicos" }),
      t.query(api.addressMetrics.summary, {}),
      t.query(api.metrics.summary, {}),
    ]);
    const serialized = JSON.stringify(results);

    expect(serialized).toContain("Buraco no asfalto.");
    expect(serialized).toContain('"medium":"audio"');
    for (const secret of [CHAT_ID, HASH, DESCRIPTION, ADDRESS_QUERY, citizenId]) {
      expect(serialized).not.toContain(secret);
    }
    for (const field of ["telegramChatId", "externalIdHash", "description", "citizenId", "query"]) {
      expect(serialized).not.toContain(field);
    }
  });
});

describe("occurrences.listByAgency", () => {
  it("returns the agency queue sorted by appeal with counters", async () => {
    const { t } = await setup();
    const queue = await t.query(api.occurrences.listByAgency, {
      slug: "servicos-publicos",
    });
    expect(queue).not.toBeNull();
    const appeals = queue!.occurrences.map((o) => o.appeal);
    expect(appeals[0]).toBe(100);
    expect(appeals).toEqual([...appeals].sort((a, b) => b - a));
    expect(queue!.openCount).toBe(queue!.occurrences.length);
    expect(queue!.totalAppeal).toBe(appeals.reduce((a, b) => a + b, 0));
    expect(queue!.occurrences.every((o) => o.agencySlug === "servicos-publicos")).toBe(
      true,
    );
  });

  it("returns null for an unknown agency", async () => {
    const { t } = await setup();
    expect(await t.query(api.occurrences.listByAgency, { slug: "nope" })).toBeNull();
  });
});
