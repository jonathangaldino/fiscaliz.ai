import { v } from "convex/values";
import { internalMutation, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { AGENCIES, CATEGORIES, type AgencySlug } from "./lib/categories";
import { SEED_OCCURRENCES } from "./seedData";

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
 * Loads agencies and synthetic occurrences.
 * Run once per deployment: `npx convex run seed:run`.
 * Idempotent: occurrences are only inserted when no seed data exists.
 */
export const run = internalMutation({
  args: {},
  returns: v.object({ agencies: v.number(), occurrences: v.number() }),
  handler: async (ctx) => {
    const agencyIds = await upsertAgencies(ctx);

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
