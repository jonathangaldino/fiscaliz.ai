/**
 * Sends messages through the Telegram Bot API (ADR 0009). Actions only.
 */
import type { OutgoingMessage } from "../types";

function token(): string {
  const value = process.env.TELEGRAM_BOT_TOKEN;
  if (!value) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  return value;
}

/** Bot copy uses *bold*; Telegram HTML needs <b> and escaped & < >. */
export function toTelegramHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*([^*\n]+)\*/g, "<b>$1</b>");
}

/** Builds the sendMessage body: text, plus inline buttons in one row. */
export function toTelegramPayload(chatId: string, message: OutgoingMessage) {
  return {
    chat_id: chatId,
    // Limit is 4096 after entity parsing; slicing the source keeps us under it.
    text: toTelegramHtml(message.text.slice(0, 4096)),
    parse_mode: "HTML",
    ...(message.buttons?.length && {
      reply_markup: {
        inline_keyboard: [
          // callback_data is capped at 64 bytes; ours are "yes" or verify:<id>:<answer>.
          message.buttons.map((button) => ({ text: button.title, callback_data: button.id })),
        ],
      },
    }),
  };
}

export async function sendTelegram(
  chatId: string,
  messages: OutgoingMessage[],
): Promise<void> {
  for (const message of messages) await call("sendMessage", toTelegramPayload(chatId, message));
}

/** Stops the loading spinner on the button the citizen tapped. */
export async function answerCallback(callbackQueryId: string): Promise<void> {
  await call("answerCallbackQuery", { callback_query_id: callbackQueryId });
}

export async function call(method: string, body: unknown): Promise<unknown> {
  const response = await fetch(`https://api.telegram.org/bot${token()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    result?: unknown;
    description?: string;
  };
  if (!response.ok || !json.ok) {
    // Never log the body we sent or the URL: they hold the chat id and the token.
    throw new Error(
      `Telegram ${method} failed: HTTP ${response.status} (${json.description ?? "no description"})`,
    );
  }
  return json.result;
}
