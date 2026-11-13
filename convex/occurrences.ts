import { v, type Infer } from "convex/values";
import { query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { CATEGORIES } from "./lib/categories";
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

/** Open occurrences for the map, highest appeal first. */
export const listOpen = query({
  args: {},
  returns: v.array(publicOccurrenceValidator),
  handler: async (ctx) => {
    const docs = await ctx.db
      .query("occurrences")
      .withIndex("by_status_appeal", (q) => q.eq("status", "open"))
      .order("desc")
      .take(MAP_LIMIT);
    return docs.map(toPublicOccurrence);
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

/** An agency's queue: open occurrences, highest appeal first, plus counters. */
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
    const open = await ctx.db
      .query("occurrences")
      .withIndex("by_agency_status", (q) =>
        q.eq("agencyId", agency._id).eq("status", "open"),
      )
      .take(MAP_LIMIT);
    open.sort((a, b) => b.appeal - a.appeal);
    return {
      occurrences: open.map(toPublicOccurrence),
      openCount: open.length,
      totalAppeal: open.reduce((sum, o) => sum + o.appeal, 0),
    };
  },
});
