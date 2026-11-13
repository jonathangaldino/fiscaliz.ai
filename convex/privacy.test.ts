import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

// Synthetic personal data that must never reach the browser.
const PHONE = "5543988887777";
const HASH = "citizen-hash-abc";
const DESCRIPTION = "Moro no número 123, meu nome é Fulano, o buraco fica em frente";

async function setup() {
  const t = convexTest(schema, modules);
  await t.mutation(internal.seed.run, {});
  const ids = await t.run(async (ctx) => {
    const agency = await ctx.db
      .query("agencies")
      .withIndex("by_slug", (q) => q.eq("slug", "servicos-publicos"))
      .unique();
    const citizenId = await ctx.db.insert("citizens", {
      channel: "whatsapp",
      externalIdHash: HASH,
      phone: PHONE,
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
      source: "whatsapp",
    });
    await ctx.db.insert("reports", {
      occurrenceId,
      citizenId,
      description: DESCRIPTION,
      occurredAt: Date.now(),
      createdAt: Date.now(),
    });
    return { occurrenceId, citizenId };
  });
  return { t, ...ids };
}

describe("public queries never expose personal data", () => {
  it("leaves out phone, citizen ids and report descriptions", async () => {
    const { t, occurrenceId, citizenId } = await setup();
    const results = await Promise.all([
      t.query(api.occurrences.listOpen, {}),
      t.query(api.occurrences.get, { id: occurrenceId }),
      t.query(api.occurrences.listByAgency, { slug: "servicos-publicos" }),
      t.query(api.agencies.list, {}),
      t.query(api.agencies.getBySlug, { slug: "servicos-publicos" }),
    ]);
    const serialized = JSON.stringify(results);

    expect(serialized).toContain("Buraco no asfalto.");
    for (const secret of [PHONE, HASH, DESCRIPTION, citizenId]) {
      expect(serialized).not.toContain(secret);
    }
    for (const field of ["phone\":\"55", "externalIdHash", "description", "citizenId"]) {
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
