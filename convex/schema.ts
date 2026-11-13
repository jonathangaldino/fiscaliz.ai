import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  categoryValidator,
  occurrenceStatusValidator,
  sourceValidator,
} from "./validators";

export default defineSchema({
  // Institutional contact only. Never a person's name.
  agencies: defineTable({
    slug: v.string(),
    name: v.string(),
    phone: v.string(),
    email: v.string(),
    url: v.string(),
  }).index("by_slug", ["slug"]),

  occurrences: defineTable({
    category: categoryValidator,
    // "other" has no agency.
    agencyId: v.optional(v.id("agencies")),
    status: occurrenceStatusValidator,
    lat: v.number(),
    lng: v.number(),
    address: v.string(),
    // Public text rewritten by the AI, without personal data.
    summary: v.string(),
    // Denormalized count of distinct citizens with a report here.
    appeal: v.number(),
    openedAt: v.number(),
    verificationStartedAt: v.optional(v.number()),
    resolvedAt: v.optional(v.number()),
    source: sourceValidator,
  })
    .index("by_category_status", ["category", "status"])
    .index("by_status_appeal", ["status", "appeal"])
    .index("by_agency_status", ["agencyId", "status"]),
});
