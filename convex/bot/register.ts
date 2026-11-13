import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { agencyForCategory } from "../lib/categories";
import { haversine } from "../lib/geo";
import { APPROXIMATE_RADIUS_M } from "./dedup";
import type { CompleteDraft } from "./types";

export type RegisterResult =
  | { kind: "created"; occurrenceId: Id<"occurrences"> }
  | { kind: "appealed"; occurrenceId: Id<"occurrences">; appeal: number }
  | { kind: "already_reported"; occurrenceId: Id<"occurrences">; appeal: number };

/**
 * Creates the report and either joins an existing occurrence (adding appeal)
 * or opens a new one. Runs inside the same mutation that updates the
 * conversation, so a failure never leaves half a registration.
 *
 * `matchId` comes from the AI, decided before this mutation ran; the
 * occurrence is re-validated here, in the same transaction that adds appeal.
 */
export async function registerReport(
  ctx: MutationCtx,
  args: {
    citizenId: Id<"citizens">;
    draft: CompleteDraft;
    source: "whatsapp" | "simulator";
    now: number;
    matchId: Id<"occurrences"> | null;
  },
): Promise<RegisterResult> {
  const { draft, now, citizenId } = args;

  const match = args.matchId ? await ctx.db.get(args.matchId) : null;
  const matchStillValid =
    match !== null &&
    match.status === "open" &&
    match.category === draft.category &&
    haversine(match, draft) <= APPROXIMATE_RADIUS_M;

  if (match && matchStillValid) {
    const existing = await ctx.db
      .query("reports")
      .withIndex("by_occurrence_citizen", (q) =>
        q.eq("occurrenceId", match._id).eq("citizenId", citizenId),
      )
      .first();
    // Appeal counts people, not messages.
    if (existing) {
      return {
        kind: "already_reported",
        occurrenceId: match._id,
        appeal: match.appeal,
      };
    }
    const appeal = match.appeal + 1;
    await ctx.db.patch(match._id, { appeal });
    await insertReport(ctx, match._id, citizenId, draft, now);
    return { kind: "appealed", occurrenceId: match._id, appeal };
  }

  const agency = agencyForCategory(draft.category);
  const agencyDoc = agency
    ? await ctx.db
        .query("agencies")
        .withIndex("by_slug", (q) => q.eq("slug", agency.slug))
        .unique()
    : null;

  const occurrenceId = await ctx.db.insert("occurrences", {
    category: draft.category,
    agencyId: agencyDoc?._id,
    status: "open",
    lat: draft.lat,
    lng: draft.lng,
    address: draft.address,
    summary: draft.summary,
    appeal: 1,
    openedAt: now,
    source: args.source,
  });
  await insertReport(ctx, occurrenceId, citizenId, draft, now);
  return { kind: "created", occurrenceId };
}

async function insertReport(
  ctx: MutationCtx,
  occurrenceId: Id<"occurrences">,
  citizenId: Id<"citizens">,
  draft: CompleteDraft,
  now: number,
) {
  await ctx.db.insert("reports", {
    occurrenceId,
    citizenId,
    description: draft.description,
    occurredAt: draft.occurredAt,
    createdAt: now,
  });
}
