import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { isValidSecret, parseUpdate } from "./telegram/webhook";

const http = httpRouter();

// The /whatsapp routes are off since Meta banned the account (ADR 0009).
// convex/whatsapp/ keeps the code; the release `whatsapp-final` has the last
// version that served it.

/**
 * Telegram updates. Checks the webhook secret, drops re-deliveries, schedules
 * processing and answers 200 right away, without waiting for the AI.
 */
http.route({
  path: "/telegram",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (
      !secret ||
      !isValidSecret(request.headers.get("x-telegram-bot-api-secret-token"), secret)
    ) {
      return new Response("Unauthorized", { status: 401 });
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    const message = parseUpdate(payload);
    if (message) {
      const isNew = await ctx.runMutation(internal.bot.processed.markProcessed, {
        channel: "telegram",
        messageId: message.messageId,
      });
      if (isNew) {
        await ctx.scheduler.runAfter(0, internal.bot.handleIncoming.handleIncoming, {
          message,
        });
      }
    }
    return new Response("OK", { status: 200 });
  }),
});

export default http;
