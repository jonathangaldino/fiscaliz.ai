/**
 * Sends messages through the WhatsApp Cloud API (ADR 0002). Actions only.
 */
import type { OutgoingMessage } from "../types";

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION ?? "v23.0";

function config() {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    throw new Error("WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID is not set");
  }
  return { token, phoneNumberId };
}

/** Builds the Graph API body: plain text, or reply buttons (max 3). */
export function toGraphPayload(to: string, message: OutgoingMessage) {
  if (message.buttons?.length) {
    return {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        // Interactive bodies are limited to 1024 characters.
        body: { text: message.text.slice(0, 1024) },
        action: {
          buttons: message.buttons.slice(0, 3).map((button) => ({
            type: "reply",
            reply: { id: button.id, title: button.title.slice(0, 20) },
          })),
        },
      },
    };
  }
  return {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: message.text.slice(0, 4096), preview_url: true },
  };
}

export async function sendWhatsApp(
  to: string,
  messages: OutgoingMessage[],
): Promise<void> {
  const { token, phoneNumberId } = config();
  for (const message of messages) {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(toGraphPayload(to, message)),
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!response.ok) {
      // Never log the body we sent: it may contain the phone number.
      throw new Error(`WhatsApp send failed: HTTP ${response.status}`);
    }
  }
}
