import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";
import { isInsideApucarana } from "./lib/geo";
import { SEED_OCCURRENCES } from "./seedData";

const PUBLIC_FIELDS = [
  "_id",
  "address",
  "agencySlug",
  "appeal",
  "category",
  "lat",
  "lng",
  "openedAt",
  "source",
  "status",
  "summary",
].sort();

describe("seed", () => {
  it("places every synthetic occurrence inside Apucarana", () => {
    for (const item of SEED_OCCURRENCES) {
      expect(isInsideApucarana(item), item.address).toBe(true);
    }
  });

  it("loads agencies and occurrences once", async () => {
    const t = convexTest(schema, modules);
    const first = await t.mutation(internal.seed.run, {});
    expect(first).toEqual({ agencies: 7, occurrences: SEED_OCCURRENCES.length });

    const second = await t.mutation(internal.seed.run, {});
    expect(second).toEqual({ agencies: 7, occurrences: 0 });

    const agencies = await t.query(api.agencies.list, {});
    expect(agencies).toHaveLength(7);
  });
});

describe("occurrences.listOpen", () => {
  it("returns open occurrences sorted by appeal, with public fields only", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.seed.run, {});
    await t.run(async (ctx) => {
      await ctx.db.insert("occurrences", {
        category: "pavement",
        status: "resolved",
        lat: -23.55,
        lng: -51.46,
        address: "Rua X",
        summary: "Resolvida",
        appeal: 999,
        openedAt: 0,
        resolvedAt: 1,
        source: "seed",
      });
    });

    const list = await t.query(api.occurrences.listOpen, {});
    expect(list).toHaveLength(SEED_OCCURRENCES.length);
    expect(list.every((o) => o.status === "open")).toBe(true);

    const appeals = list.map((o) => o.appeal);
    expect(appeals).toEqual([...appeals].sort((a, b) => b - a));

    for (const item of list) {
      expect(Object.keys(item).sort()).toEqual(PUBLIC_FIELDS);
    }
  });
});
