import { v } from "convex/values";
import { CATEGORY_KEYS } from "./lib/categories";

const literals = <T extends string>(values: readonly T[]) =>
  values.map((value) => v.literal(value)) as unknown as [
    ReturnType<typeof v.literal<T>>,
    ReturnType<typeof v.literal<T>>,
    ...ReturnType<typeof v.literal<T>>[],
  ];

export const categoryValidator = v.union(...literals(CATEGORY_KEYS));

export const occurrenceStatusValidator = v.union(
  v.literal("open"),
  v.literal("verifying"),
  v.literal("resolved"),
);

export const sourceValidator = v.union(
  v.literal("whatsapp"),
  v.literal("simulator"),
  v.literal("seed"),
);

export const channelValidator = v.union(
  v.literal("whatsapp"),
  v.literal("simulator"),
);

/** What the conversation has gathered so far. Every field is optional. */
export const draftValidator = v.object({
  category: v.optional(categoryValidator),
  description: v.optional(v.string()),
  summary: v.optional(v.string()),
  address: v.optional(v.string()),
  lat: v.optional(v.number()),
  lng: v.optional(v.number()),
  // Whether the location is precise (pin or street number): sets the dedup radius.
  precise: v.optional(v.boolean()),
  occurredAt: v.optional(v.number()),
});

export const conversationStateValidator = v.union(
  v.object({ phase: v.literal("collecting"), draft: draftValidator }),
  v.object({ phase: v.literal("confirming"), draft: draftValidator }),
);

// "yes" / "no" for the conversation, or a verification answer (lib/verification).
export const buttonValidator = v.object({
  id: v.string(),
  title: v.string(),
});

export const verificationAnswerValidator = v.object({
  occurrenceId: v.string(),
  answer: v.union(v.literal("yes"), v.literal("no")),
});

export const outgoingMessageValidator = v.object({
  text: v.string(),
  buttons: v.optional(v.array(buttonValidator)),
});

export const incomingMessageValidator = v.object({
  channel: channelValidator,
  // Phone number (WhatsApp) or random session id (simulator). Never stored raw
  // except citizens.phone for WhatsApp.
  externalId: v.string(),
  messageId: v.optional(v.string()),
  receivedAt: v.number(),
  text: v.optional(v.string()),
  location: v.optional(v.object({ lat: v.number(), lng: v.number() })),
  button: v.optional(v.union(v.literal("yes"), v.literal("no"))),
  // Answer to a V2 verification question; skips the conversation entirely.
  verification: v.optional(verificationAnswerValidator),
  // WhatsApp voice note: transcribed in the action, never stored.
  audioMediaId: v.optional(v.string()),
  // Media types the bot does not handle (image, sticker, video...).
  unsupported: v.optional(v.boolean()),
});

// Address reliability metrics (issue #37).
export const geocodeSourceValidator = v.union(
  v.literal("cnefe_exact"),
  v.literal("cnefe_typo"),
  v.literal("google"),
  v.literal("none"),
);

export const geocodeOutcomeValidator = v.union(
  v.literal("confirmed"),
  v.literal("corrected_pin"),
  v.literal("corrected_text"),
  v.literal("abandoned"),
);

/** What the action measured on one geocoded address; applyStep stores it. */
export const geocodeAttemptValidator = v.object({
  // How the citizen sent the address. Not `channel`, which is whatsapp/simulator.
  medium: v.union(v.literal("text"), v.literal("audio")),
  source: geocodeSourceValidator,
  typoDistance: v.number(),
  ambiguous: v.boolean(),
  ms: v.number(),
  // The address text, kept only when it failed or was ambiguous.
  query: v.optional(v.string()),
});
