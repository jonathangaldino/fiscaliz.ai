import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { isValidSignature, parseWebhook } from "./whatsapp/webhook";

const http = httpRouter();

/** Meta webhook verification handshake. */
http.route({
  path: "/whatsapp",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    const params = new URL(request.url).searchParams;
    const expected = process.env.WHATSAPP_VERIFY_TOKEN;
    if (
      expected &&
      params.get("hub.mode") === "subscribe" &&
      params.get("hub.verify_token") === expected
    ) {
      return new Response(params.get("hub.challenge") ?? "", { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }),
});

/**
 * Incoming messages. Validates the signature, drops re-deliveries, schedules
 * processing and answers 200 right away, without waiting for the AI.
 */
http.route({
  path: "/whatsapp",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    const rawBody = await request.text();
    if (
      !appSecret ||
      !(await isValidSignature(
        rawBody,
        request.headers.get("x-hub-signature-256"),
        appSecret,
      ))
    ) {
      return new Response("Unauthorized", { status: 401 });
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    for (const message of parseWebhook(payload)) {
      const isNew = await ctx.runMutation(internal.whatsapp.processed.markProcessed, {
        messageId: message.messageId,
      });
      if (!isNew) continue;
      await ctx.scheduler.runAfter(0, internal.bot.handleIncoming.handleIncoming, {
        message,
      });
    }
    return new Response("OK", { status: 200 });
  }),
});

export default http;
