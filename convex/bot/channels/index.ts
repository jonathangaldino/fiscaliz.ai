import { internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";
import { sendTelegram } from "./telegram";
import { sendWhatsApp } from "./whatsapp";
import type { IncomingMessage, OutgoingMessage } from "../types";

/**
 * The bot core does not know where a message came from. Each channel only
 * knows how to send a reply back.
 */
export async function send(
  ctx: ActionCtx,
  message: Pick<IncomingMessage, "channel" | "externalId">,
  replies: OutgoingMessage[],
): Promise<void> {
  if (replies.length === 0) return;
  switch (message.channel) {
    case "simulator":
      await ctx.runMutation(internal.bot.channels.simulator.deliver, {
        sessionId: message.externalId,
        messages: replies,
      });
      return;
    case "telegram":
      await sendTelegram(message.externalId, replies);
      return;
    // Dormant (ADR 0009): no route delivers WhatsApp messages anymore.
    case "whatsapp":
      await sendWhatsApp(message.externalId, replies);
      return;
  }
}
