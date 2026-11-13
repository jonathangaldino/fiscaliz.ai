import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { internalQuery } from "../_generated/server";
import { haversine, type LatLng } from "../lib/geo";
import { categoryValidator } from "../validators";

/** Radius for a precise location (pin or street number). */
export const PRECISE_RADIUS_M = 50;
/** Radius when only the street is known. */
export const APPROXIMATE_RADIUS_M = 150;
export const MAX_CANDIDATES = 5;

export function dedupRadius(precise: boolean): number {
  return precise ? PRECISE_RADIUS_M : APPROXIMATE_RADIUS_M;
}

export type Candidate = {
  id: Doc<"occurrences">["_id"];
  summary: string;
  address: string;
  distanceM: number;
};

/** Open occurrences within the radius, nearest first. */
export function nearest(
  occurrences: Doc<"occurrences">[],
  point: LatLng,
  radiusM: number,
): Candidate[] {
  return occurrences
    .map((o) => ({
      id: o._id,
      summary: o.summary,
      address: o.address,
      distanceM: Math.round(haversine(point, o)),
    }))
    .filter((c) => c.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, MAX_CANDIDATES);
}

/**
 * Candidates for de-duplication: open, same category, inside the radius.
 * Filtering by distance in memory is fine for a small city's volume.
 */
export const candidates = internalQuery({
  args: {
    category: categoryValidator,
    lat: v.number(),
    lng: v.number(),
    precise: v.boolean(),
  },
  returns: v.array(
    v.object({
      id: v.id("occurrences"),
      summary: v.string(),
      address: v.string(),
      distanceM: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const open = await ctx.db
      .query("occurrences")
      .withIndex("by_category_status", (q) =>
        q.eq("category", args.category).eq("status", "open"),
      )
      .collect();
    return nearest(open, args, dedupRadius(args.precise));
  },
});
