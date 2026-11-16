/**
 * Address reliability metrics (issue #37): one row per geocoded address,
 * closed with an outcome once the citizen confirms, corrects or leaves.
 */
import type { Infer } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { haversine, type LatLng } from "../lib/geo";
import type { geocodeOutcomeValidator } from "../validators";

/**
 * Sets the outcome of the citizen's resolved address still waiting for one.
 * `pin` is the corrected location, to measure how far off the address was.
 */
export async function closeOpenAttempts(
  ctx: MutationCtx,
  citizenId: Id<"citizens">,
  outcome: Infer<typeof geocodeOutcomeValidator>,
  pin?: LatLng,
) {
  const open = await ctx.db
    .query("geocodeAttempts")
    .withIndex("by_citizen_outcome", (q) =>
      q.eq("citizenId", citizenId).eq("outcome", undefined),
    )
    .collect();
  for (const attempt of open) {
    // Not found: nothing was shown to the citizen, so there is nothing to confirm.
    if (attempt.lat === undefined || attempt.lng === undefined) continue;
    const point = { lat: attempt.lat, lng: attempt.lng };
    await ctx.db.patch(attempt._id, {
      outcome,
      errorMeters: pin ? Math.round(haversine(point, pin)) : undefined,
    });
  }
}
