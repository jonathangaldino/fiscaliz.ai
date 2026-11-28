import { v } from "convex/values";
import { internalMutation, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { AGENCIES, CATEGORIES, type AgencySlug } from "./lib/categories";
import { pickupAddressKey } from "./lib/pickup";
import { SEED_OCCURRENCES, SEED_PICKUP_POINTS } from "./seedData";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Inserts or updates every agency from categories.ts. */
export async function upsertAgencies(
  ctx: MutationCtx,
): Promise<Record<AgencySlug, Id<"agencies">>> {
  const ids = {} as Record<AgencySlug, Id<"agencies">>;
  for (const agency of Object.values(AGENCIES)) {
    const existing = await ctx.db
      .query("agencies")
      .withIndex("by_slug", (q) => q.eq("slug", agency.slug))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, agency);
      ids[agency.slug] = existing._id;
    } else {
      ids[agency.slug] = await ctx.db.insert("agencies", agency);
    }
  }
  return ids;
}

/**
 * Loads only the agencies, then links occurrences created while they were missing.
 * Run with `npx convex run seed:agencies`. Idempotent.
 */
export const agencies = internalMutation({
  args: {},
  returns: v.object({ agencies: v.number(), linked: v.number() }),
  handler: async (ctx) => {
    const agencyIds = await upsertAgencies(ctx);
    let linked = 0;
    for await (const occurrence of ctx.db.query("occurrences")) {
      const slug = CATEGORIES[occurrence.category].agency;
      if (occurrence.agencyId || !slug) continue;
      await ctx.db.patch(occurrence._id, { agencyId: agencyIds[slug] });
      linked++;
    }
    return { agencies: Object.keys(agencyIds).length, linked };
  },
});

/**
 * Loads agencies and synthetic occurrences.
 * Run once per deployment: `npx convex run seed:run`.
 * Idempotent: occurrences are only inserted when no seed data exists.
 */
export const run = internalMutation({
  args: {},
  returns: v.object({ agencies: v.number(), occurrences: v.number() }),
  handler: async (ctx) => {
    const agencyIds = await upsertAgencies(ctx);
    await seedPickupPoints(ctx);

    const alreadySeeded = await ctx.db
      .query("occurrences")
      .filter((q) => q.eq(q.field("source"), "seed"))
      .first();
    if (alreadySeeded) {
      return { agencies: Object.keys(agencyIds).length, occurrences: 0 };
    }

    const now = Date.now();
    for (const item of SEED_OCCURRENCES) {
      const agencySlug = CATEGORIES[item.category].agency;
      await ctx.db.insert("occurrences", {
        category: item.category,
        agencyId: agencySlug ? agencyIds[agencySlug] : undefined,
        status: "open",
        lat: item.lat,
        lng: item.lng,
        address: item.address,
        summary: item.summary,
        appeal: item.appeal,
        openedAt: now - item.daysAgo * DAY_MS,
        source: "seed",
      });
    }
    return {
      agencies: Object.keys(agencyIds).length,
      occurrences: SEED_OCCURRENCES.length,
    };
  },
});

/** Idempotent: only when no seed pickup point exists yet. */
async function seedPickupPoints(ctx: MutationCtx) {
  const seeded = await ctx.db
    .query("pickupPoints")
    .filter((q) => q.eq(q.field("source"), "seed"))
    .first();
  if (seeded) return;
  const now = Date.now();
  for (const { daysAgo, ...point } of SEED_PICKUP_POINTS) {
    await ctx.db.insert("pickupPoints", {
      ...point,
      status: "waiting",
      addressKey: pickupAddressKey(point.address),
      openedAt: now - daysAgo * DAY_MS,
      source: "seed",
    });
  }
}
