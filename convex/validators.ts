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

export const buttonValidator = v.object({
  id: v.union(v.literal("yes"), v.literal("no")),
  title: v.string(),
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
  // Media types the bot does not handle (image, sticker, video...).
  unsupported: v.optional(v.boolean()),
});
