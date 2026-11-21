/**
 * Pure helpers for the Telegram Bot API webhook: secret check and update
 * parsing. No I/O, so they are easy to test.
 */
import type { IncomingMessage } from "../bot/types";
import { parseVerifyButton } from "../lib/verification";

/** Constant-time check of X-Telegram-Bot-Api-Secret-Token. */
export function isValidSecret(header: string | null, secret: string): boolean {
  if (!header || header.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i++) {
    diff |= secret.charCodeAt(i) ^ header.charCodeAt(i);
  }
  return diff === 0;
}

type Chat = { id: number; type: string };

type TelegramMessage = {
  message_id: number;
  date: number;
  chat: Chat;
  text?: string;
  location?: { latitude: number; longitude: number };
  voice?: { file_id: string };
  audio?: { file_id: string };
  // Sizes of the same photo, smallest first.
  photo?: { file_id: string }[];
  caption?: string;
};

type Update = {
  update_id?: number;
  message?: TelegramMessage;
  callback_query?: {
    id: string;
    data?: string;
    message?: TelegramMessage;
  };
};

export type ParsedMessage = IncomingMessage & {
  channel: "telegram";
  messageId: string;
};

/**
 * Extracts the citizen message from one update. Group chats and update kinds
 * the bot does not ask for are ignored (null).
 */
export function parseUpdate(body: unknown): ParsedMessage | null {
  // Untrusted input: only the shape below is read, everything else ignored.
  const update = (body ?? {}) as Update;
  if (typeof update.update_id !== "number") return null;
  const source = update.message ?? update.callback_query?.message;
  if (!source || source.chat?.type !== "private") return null;

  const base = {
    channel: "telegram" as const,
    externalId: String(source.chat.id),
    messageId: String(update.update_id),
    receivedAt: Number(source.date) * 1000 || Date.now(),
  };

  const callback = update.callback_query;
  if (callback) {
    // A tap is "now", not when the message with the buttons was sent.
    const tap = { ...base, receivedAt: Date.now(), callbackQueryId: callback.id };
    if (callback.data === "yes" || callback.data === "no") {
      return { ...tap, button: callback.data };
    }
    const verification = parseVerifyButton(callback.data);
    return verification ? { ...tap, verification } : { ...tap, unsupported: true };
  }

  const message = source;
  if (typeof message.text === "string") {
    // /start (with or without a deep-link payload) opens the conversation.
    return /^\/start(\s|$)/.test(message.text)
      ? { ...base, text: "Oi" }
      : { ...base, text: message.text };
  }
  const largest = Array.isArray(message.photo) ? message.photo.at(-1) : undefined;
  if (typeof largest?.file_id === "string") {
    const caption = typeof message.caption === "string" ? message.caption : undefined;
    return { ...base, photo: { telegramFileId: largest.file_id }, text: caption };
  }
  if (message.location) {
    return {
      ...base,
      location: { lat: message.location.latitude, lng: message.location.longitude },
    };
  }
  const audio = message.voice ?? message.audio;
  if (audio?.file_id) return { ...base, audioMediaId: audio.file_id };
  return { ...base, unsupported: true };
}
