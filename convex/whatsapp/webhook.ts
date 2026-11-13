/**
 * Pure helpers for the WhatsApp Cloud API webhook: signature check and
 * payload parsing. No I/O, so they are easy to test.
 */
import type { IncomingMessage } from "../bot/types";

/** Constant-time check of X-Hub-Signature-256 (HMAC-SHA256 of the raw body). */
export async function isValidSignature(
  rawBody: string,
  header: string | null,
  appSecret: string,
): Promise<boolean> {
  if (!header?.startsWith("sha256=")) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody)),
  );
  const expected = Array.from(signature)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  const received = header.slice("sha256=".length).toLowerCase();
  if (received.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ received.charCodeAt(i);
  }
  return diff === 0;
}

type WebhookMessage = {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  location?: { latitude: number; longitude: number };
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
  };
  button?: { payload?: string; text?: string };
};

type WebhookPayload = {
  object?: string;
  entry?: {
    changes?: {
      field?: string;
      value?: { messages?: WebhookMessage[]; statuses?: unknown[] };
    }[];
  }[];
};

export type ParsedMessage = IncomingMessage & {
  channel: "whatsapp";
  messageId: string;
};

/**
 * Extracts citizen messages from a webhook payload. Status notifications
 * (sent, delivered, read) are ignored.
 */
export function parseWebhook(body: unknown): ParsedMessage[] {
  // Untrusted input: only the shape below is read, everything else ignored.
  const payload = (body ?? {}) as WebhookPayload;
  if (payload.object !== "whatsapp_business_account") return [];
  const parsed: ParsedMessage[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value?.messages ?? []) {
        parsed.push(toIncoming(message));
      }
    }
  }
  return parsed;
}

function toIncoming(message: WebhookMessage): ParsedMessage {
  const base = {
    channel: "whatsapp" as const,
    externalId: message.from,
    messageId: message.id,
    receivedAt: Number(message.timestamp) * 1000 || Date.now(),
  };
  switch (message.type) {
    case "text":
      return { ...base, text: message.text?.body };
    case "location":
      return message.location
        ? {
            ...base,
            location: {
              lat: message.location.latitude,
              lng: message.location.longitude,
            },
          }
        : { ...base, unsupported: true };
    case "interactive": {
      const id = message.interactive?.button_reply?.id;
      return id === "yes" || id === "no"
        ? { ...base, button: id }
        : { ...base, text: message.interactive?.button_reply?.title };
    }
    case "button":
      return { ...base, text: message.button?.text ?? message.button?.payload };
    default:
      return { ...base, unsupported: true };
  }
}
