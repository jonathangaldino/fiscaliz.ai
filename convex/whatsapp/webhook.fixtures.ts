/** Synthetic WhatsApp webhook payloads for tests. Fake phone numbers only. */

export const FAKE_PHONE = "5543999990000";

export function webhookPayload(
  message: Record<string, unknown>,
  id = "wamid.1",
) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA_ID",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              messages: [
                { from: FAKE_PHONE, id, timestamp: "1763650000", ...message },
              ],
            },
          },
        ],
      },
    ],
  };
}

export function statusPayload() {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              statuses: [{ id: "wamid.1", status: "delivered", recipient_id: FAKE_PHONE }],
            },
          },
        ],
      },
    ],
  };
}

export async function sign(body: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(body)),
  );
  return `sha256=${Array.from(signature)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}
