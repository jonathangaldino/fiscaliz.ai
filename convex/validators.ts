import { v } from "convex/values";
import { CATEGORY_KEYS } from "./lib/categories";
import { PICKUP_ITEMS } from "./lib/pickup";

const literals = <T extends string>(values: readonly T[]) =>
  values.map((value) => v.literal(value)) as unknown as [
    ReturnType<typeof v.literal<T>>,
    ReturnType<typeof v.literal<T>>,
    ...ReturnType<typeof v.literal<T>>[],
  ];

export const categoryValidator = v.union(...literals(CATEGORY_KEYS));

export const pickupItemValidator = v.union(...literals(PICKUP_ITEMS));

export const pickupPointStatusValidator = v.union(
  v.literal("waiting"),
  v.literal("collected"),
  v.literal("expired"),
);

export const occurrenceStatusValidator = v.union(
  v.literal("open"),
  v.literal("verifying"),
  v.literal("resolved"),
);

export const sourceValidator = v.union(
  v.literal("telegram"),
  // Dormant since the Meta ban (ADR 0009); kept so the old code still reads.
  v.literal("whatsapp"),
  v.literal("simulator"),
  v.literal("seed"),
);

export const channelValidator = v.union(
  v.literal("telegram"),
  // Dormant since the Meta ban (ADR 0009); kept so the old code still reads.
  v.literal("whatsapp"),
  v.literal("simulator"),
);

/**
 * The citizen's original photo, before anonymization. Telegram keeps the file
 * (we hold only its id); the simulator upload sits in Convex storage until SIM.
 */
export const draftPhotoValidator = v.union(
  v.object({ telegramFileId: v.string() }),
  v.object({ storageId: v.id("_storage") }),
);

/** Photo on an occurrence: only the anonymized copy is ever stored here. */
export const occurrencePhotoValidator = v.union(
  v.object({ status: v.literal("processing") }),
  v.object({ status: v.literal("ready"), storageId: v.id("_storage") }),
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
  photo: v.optional(draftPhotoValidator),
  // Pickup request (ADR 0011) instead of a report.
  intent: v.optional(v.literal("pickup")),
  items: v.optional(v.array(pickupItemValidator)),
  // Apartment, block...: internal only, never on the map.
  complement: v.optional(v.string()),
  // Street + number of a typed address; absent for a pin.
  addressKey: v.optional(v.string()),
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
  // Telegram chat id or random session id (simulator). Never stored raw
  // except in citizens.telegramChatId / citizens.sessionId.
  externalId: v.string(),
  messageId: v.optional(v.string()),
  receivedAt: v.number(),
  text: v.optional(v.string()),
  location: v.optional(v.object({ lat: v.number(), lng: v.number() })),
  button: v.optional(v.union(v.literal("yes"), v.literal("no"))),
  // Answer to a V2 verification question; skips the conversation entirely.
  verification: v.optional(verificationAnswerValidator),
  // Voice note (Telegram file_id): transcribed in the action, never stored.
  audioMediaId: v.optional(v.string()),
  // One photo per report (ADR 0010).
  photo: v.optional(draftPhotoValidator),
  // Telegram button tap: answered so the client stops the loading spinner.
  callbackQueryId: v.optional(v.string()),
  // Media types the bot does not handle (file, sticker, video...).
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
  // How the citizen sent the address. Not `channel`, which is telegram/simulator.
  medium: v.union(v.literal("text"), v.literal("audio")),
  source: geocodeSourceValidator,
  typoDistance: v.number(),
  ambiguous: v.boolean(),
  ms: v.number(),
  // The address text, kept only when it failed or was ambiguous.
  query: v.optional(v.string()),
});
