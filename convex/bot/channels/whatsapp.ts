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
  for (const message of messages) await post(toGraphPayload(to, message));
}

// Approved Meta template (id 29312198131747499). Its body, buttons and footer
// live at Meta; the simulator copy is messages.verificationQuestion.
const VERIFICATION_TEMPLATE = "occurrence_verification";

// Template parameters reject newlines, tabs and runs of 4+ spaces.
const param = (value: string) => value.replace(/\s+/g, " ").trim().slice(0, 500);

/** V2 question to a citizen, outside the 24 h window (ADR 0002). */
export function toVerificationPayload(
  to: string,
  occurrence: { id: string; summary: string; address: string },
  buttons: { yes: string; no: string },
) {
  return {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: VERIFICATION_TEMPLATE,
      language: { code: "pt_BR" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: param(occurrence.summary) },
            { type: "text", text: param(occurrence.address) },
          ],
        },
        {
          type: "button",
          sub_type: "quick_reply",
          index: "0",
          parameters: [{ type: "payload", payload: buttons.yes }],
        },
        {
          type: "button",
          sub_type: "quick_reply",
          index: "1",
          parameters: [{ type: "payload", payload: buttons.no }],
        },
        {
          type: "button",
          sub_type: "url",
          index: "2",
          parameters: [{ type: "text", text: occurrence.id }],
        },
      ],
    },
  };
}

export async function sendVerificationTemplate(
  ...args: Parameters<typeof toVerificationPayload>
): Promise<void> {
  await post(toVerificationPayload(...args));
}

async function post(body: unknown): Promise<void> {
  const { token, phoneNumberId } = config();
  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) {
    // Never log the body we sent: it may contain the phone number.
    // Graph's error code and message identify the cause without it.
    const { error } = await response.json().catch(() => ({ error: undefined }));
    throw new Error(
      `WhatsApp send failed: HTTP ${response.status} (${error?.code ?? "?"}: ${error?.message ?? "no message"})`,
    );
  }
}
