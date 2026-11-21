import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  buttonValidator,
  categoryValidator,
  channelValidator,
  conversationStateValidator,
  geocodeAttemptValidator,
  geocodeOutcomeValidator,
  occurrencePhotoValidator,
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
    // Last time a verification failed: blocks a new one for 7 days.
    reopenedAt: v.optional(v.number()),
    source: sourceValidator,
    // Public photo with faces and plates blurred (ADR 0010).
    photo: v.optional(occurrencePhotoValidator),
  })
    .index("by_category_status", ["category", "status"])
    .index("by_status_appeal", ["status", "appeal"])
    .index("by_agency_status", ["agencyId", "status"])
    .index("by_photo", ["photo.storageId"]),

  // A citizen's report on an occurrence. Never sent to the browser.
  reports: defineTable({
    occurrenceId: v.id("occurrences"),
    citizenId: v.id("citizens"),
    // Internal description, may contain personal data.
    description: v.string(),
    occurredAt: v.number(),
    createdAt: v.number(),
    // When the citizen's conversation began, for the time to the map (issue #54).
    startedAt: v.optional(v.number()),
  })
    .index("by_occurrence_citizen", ["occurrenceId", "citizenId"])
    .index("by_citizen_createdAt", ["citizenId", "createdAt"]),

  citizens: defineTable({
    channel: channelValidator,
    // HMAC of the chat id or simulator session, keyed by CITIZEN_HASH_SECRET.
    externalIdHash: v.string(),
    // Telegram only: V2 verification needs to message the citizen back.
    telegramChatId: v.optional(v.string()),
    // Dormant WhatsApp channel (ADR 0009).
    phone: v.optional(v.string()),
    // Simulator only: random browser session id, to deliver the verification.
    sessionId: v.optional(v.string()),
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

  // Answers to the current verification round. Deleted when the round ends.
  verificationVotes: defineTable({
    occurrenceId: v.id("occurrences"),
    citizenId: v.id("citizens"),
    answer: v.union(v.literal("yes"), v.literal("no")),
    createdAt: v.number(),
  }).index("by_occurrence_citizen", ["occurrenceId", "citizenId"]),

  // Idempotency: Telegram re-sends an update when it does not get a 200 in time.
  processedMessages: defineTable({
    channel: channelValidator,
    messageId: v.string(),
  }).index("by_channel_message", ["channel", "messageId"]),

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

  // Address reliability metrics (issue #37). Internal: `query` and
  // `citizenId` never leave through a public function.
  geocodeAttempts: defineTable({
    ...geocodeAttemptValidator.fields,
    citizenId: v.id("citizens"),
    createdAt: v.number(),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    precise: v.optional(v.boolean()),
    // Filled later: on SIM, on a new pin or address, or when the conversation ends.
    outcome: v.optional(geocodeOutcomeValidator),
    errorMeters: v.optional(v.number()),
  }).index("by_citizen_outcome", ["citizenId", "outcome"]),
});
