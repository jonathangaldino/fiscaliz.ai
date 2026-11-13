import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { agencyForCategory } from "../lib/categories";
import type { CompleteDraft } from "./types";

export type RegisterResult = {
  occurrenceId: Id<"occurrences">;
  isNew: boolean;
  appeal: number;
};

/**
 * Creates the report and its occurrence. Runs inside the same mutation that
 * updates the conversation, so a failure never leaves half a registration.
 */
export async function registerReport(
  ctx: MutationCtx,
  args: {
    citizenId: Id<"citizens">;
    draft: CompleteDraft;
    source: "whatsapp" | "simulator";
    now: number;
  },
): Promise<RegisterResult> {
  const { draft, now } = args;
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
  await ctx.db.insert("reports", {
    occurrenceId,
    citizenId: args.citizenId,
    description: draft.description,
    occurredAt: draft.occurredAt,
    createdAt: now,
  });
  return { occurrenceId, isNew: true, appeal: 1 };
}
