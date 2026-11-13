import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  buttonValidator,
  categoryValidator,
  channelValidator,
  conversationStateValidator,
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

  // A citizen's report on an occurrence. Never sent to the browser.
  reports: defineTable({
    occurrenceId: v.id("occurrences"),
    citizenId: v.id("citizens"),
    // Internal description, may contain personal data.
    description: v.string(),
    occurredAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_occurrence_citizen", ["occurrenceId", "citizenId"])
    .index("by_citizen_createdAt", ["citizenId", "createdAt"]),

  citizens: defineTable({
    channel: channelValidator,
    // HMAC of the phone number or simulator session, keyed by CITIZEN_HASH_SECRET.
    externalIdHash: v.string(),
    // WhatsApp only: V2 verification needs to message the citizen back.
    phone: v.optional(v.string()),
  }).index("by_channel_hash", ["channel", "externalIdHash"]),

  conversations: defineTable({
    citizenId: v.id("citizens"),
    state: conversationStateValidator,
    // Optimistic concurrency: applyStep only writes if the version is unchanged.
    version: v.number(),
    updatedAt: v.number(),
  })
    .index("by_citizen", ["citizenId"])
    .index("by_updatedAt", ["updatedAt"]),

  // Chat log of the web simulator. sessionId is a random id kept in the browser.
  simulatorMessages: defineTable({
    sessionId: v.string(),
    author: v.union(v.literal("citizen"), v.literal("bot")),
    text: v.string(),
    buttons: v.optional(v.array(buttonValidator)),
    createdAt: v.number(),
  }).index("by_session", ["sessionId"]),

  // Emergencies and out-of-scope requests are never reports (ADR 0001):
  // only the kind, target and time. No phone, text or location.
  anonymousCounters: defineTable({
    kind: v.union(v.literal("emergency"), v.literal("out_of_scope")),
    target: v.string(),
    createdAt: v.number(),
  }).index("by_kind", ["kind"]),
});
