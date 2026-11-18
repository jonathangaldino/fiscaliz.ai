import { v, type Infer } from "convex/values";
import { query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { CATEGORIES, CATEGORY_KEYS } from "./lib/categories";
import {
  categoryValidator,
  occurrenceStatusValidator,
  sourceValidator,
} from "./validators";

/**
 * Shape of an occurrence as the browser sees it. Every public query returns
 * this validator explicitly, so a new private field never leaks by accident.
 */
export const publicOccurrenceValidator = v.object({
  _id: v.id("occurrences"),
  category: categoryValidator,
  agencySlug: v.union(v.string(), v.null()),
  status: occurrenceStatusValidator,
  lat: v.number(),
  lng: v.number(),
  address: v.string(),
  summary: v.string(),
  appeal: v.number(),
  openedAt: v.number(),
  verificationStartedAt: v.optional(v.number()),
  resolvedAt: v.optional(v.number()),
  source: sourceValidator,
});

export type PublicOccurrence = Infer<typeof publicOccurrenceValidator>;

export function toPublicOccurrence(doc: Doc<"occurrences">): PublicOccurrence {
  return {
    _id: doc._id,
    category: doc.category,
    agencySlug: CATEGORIES[doc.category].agency,
    status: doc.status,
    lat: doc.lat,
    lng: doc.lng,
    address: doc.address,
    summary: doc.summary,
    appeal: doc.appeal,
    openedAt: doc.openedAt,
    verificationStartedAt: doc.verificationStartedAt,
    resolvedAt: doc.resolvedAt,
    source: doc.source,
  };
}

const MAP_LIMIT = 1000;

/** Occurrences on the map (open and verifying), highest appeal first. */
export const listActive = query({
  args: {},
  returns: v.array(publicOccurrenceValidator),
  handler: async (ctx) => {
    const byStatus = await Promise.all(
      (["open", "verifying"] as const).map((status) =>
        ctx.db
          .query("occurrences")
          .withIndex("by_status_appeal", (q) => q.eq("status", status))
          .order("desc")
          .take(MAP_LIMIT),
      ),
    );
    return byStatus
      .flat()
      .sort((a, b) => b.appeal - a.appeal)
      .slice(0, MAP_LIMIT)
      .map(toPublicOccurrence);
  },
});

/** History: resolved occurrences, most recently resolved first. */
export const listResolved = query({
  args: {},
  returns: v.array(publicOccurrenceValidator),
  handler: async (ctx) => {
    // shortcut: the index sorts by appeal, so this reads up to MAP_LIMIT and
    // sorts by date in memory; add a by_status_resolvedAt index if it grows.
    const docs = await ctx.db
      .query("occurrences")
      .withIndex("by_status_appeal", (q) => q.eq("status", "resolved"))
      .take(MAP_LIMIT);
    return docs
      .sort((a, b) => (b.resolvedAt ?? 0) - (a.resolvedAt ?? 0))
      .map(toPublicOccurrence);
  },
});

export const get = query({
  args: { id: v.string() },
  returns: v.union(publicOccurrenceValidator, v.null()),
  handler: async (ctx, { id }) => {
    const occurrenceId = ctx.db.normalizeId("occurrences", id);
    if (!occurrenceId) return null;
    const doc = await ctx.db.get(occurrenceId);
    return doc ? toPublicOccurrence(doc) : null;
  },
});

/** An agency's queue: unresolved occurrences, highest appeal first, plus counters. */
export const listByAgency = query({
  args: { slug: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      occurrences: v.array(publicOccurrenceValidator),
      openCount: v.number(),
      totalAppeal: v.number(),
    }),
  ),
  handler: async (ctx, { slug }) => {
    const agency = await ctx.db
      .query("agencies")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!agency) return null;
    const byStatus = await Promise.all(
      (["open", "verifying"] as const).map((status) =>
        ctx.db
          .query("occurrences")
          .withIndex("by_agency_status", (q) =>
            q.eq("agencyId", agency._id).eq("status", status),
          )
          .take(MAP_LIMIT),
      ),
    );
    const open = byStatus.flat();
    open.sort((a, b) => b.appeal - a.appeal);
    return {
      occurrences: open.map(toPublicOccurrence),
      openCount: open.length,
      totalAppeal: open.reduce((sum, o) => sum + o.appeal, 0),
    };
  },
});

/**
 * Open data export (GeoJSON/CSV API): optional filters, highest appeal first,
 * capped at MAP_LIMIT. Agency is derived from the category, so it filters by
 * the agency's categories.
 */
export const listForExport = query({
  args: {
    agency: v.optional(v.string()),
    category: v.optional(categoryValidator),
    status: v.optional(occurrenceStatusValidator),
  },
  returns: v.array(publicOccurrenceValidator),
  handler: async (ctx, { agency, category, status }) => {
    const statuses = status
      ? [status]
      : (["open", "verifying", "resolved"] as const);
    const categories = (category ? [category] : CATEGORY_KEYS).filter(
      (key) => agency === undefined || CATEGORIES[key].agency === agency,
    );
    const filtered = Boolean(category || agency);
    const batches = await Promise.all(
      filtered
        ? categories.flatMap((key) =>
            statuses.map((s) =>
              ctx.db
                .query("occurrences")
                .withIndex("by_category_status", (q) =>
                  q.eq("category", key).eq("status", s),
                )
                .take(MAP_LIMIT),
            ),
          )
        : statuses.map((s) =>
            ctx.db
              .query("occurrences")
              .withIndex("by_status_appeal", (q) => q.eq("status", s))
              .order("desc")
              .take(MAP_LIMIT),
          ),
    );
    return batches
      .flat()
      .sort((a, b) => b.appeal - a.appeal)
      .slice(0, MAP_LIMIT)
      .map(toPublicOccurrence);
  },
});
