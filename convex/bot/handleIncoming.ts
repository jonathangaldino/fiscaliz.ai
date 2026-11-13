import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { hashCitizenId } from "../lib/citizenHash";
import { incomingMessageValidator } from "../validators";
import { send } from "./channels";
import { extract } from "./extract";
import * as messages from "./messages";
import { parseDecision } from "./stateMachine";
import type { Extraction, IncomingMessage, ResolvedLocation } from "./types";

const MAX_ATTEMPTS = 3;

/**
 * Processes one citizen message from any channel. Calls external services,
 * then hands every write to `applyStep`. If an external service fails, the
 * citizen is asked to try again and nothing is stored.
 */
export const handleIncoming = internalAction({
  args: { message: incomingMessageValidator },
  handler: async (ctx, { message }) => {
    const externalIdHash = await hashCitizenId(
      message.channel,
      message.externalId,
    );
    const citizenId = await ctx.runMutation(
      internal.bot.conversations.ensureCitizen,
      {
        channel: message.channel,
        externalIdHash,
        phone: message.channel === "whatsapp" ? message.externalId : undefined,
      },
    );

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const { state, version } = await ctx.runQuery(
        internal.bot.conversations.load,
        { citizenId },
      );
      const decision = parseDecision(message.text, message.button);

      let extraction: Extraction | null = null;
      let location: ResolvedLocation | null = null;
      try {
        const isPureDecision = state?.phase === "confirming" && decision;
        if (message.text && !isPureDecision) {
          extraction = await extract({
            draft: state?.draft ?? {},
            text: message.text,
            receivedAt: message.receivedAt,
          });
        }
        location = await resolveLocation(message);
      } catch (error) {
        console.error("External service failed", error);
        await send(ctx, message, [messages.tryAgain()]);
        return;
      }

      const result = await ctx.runMutation(internal.bot.conversations.applyStep, {
        citizenId,
        channel: message.channel,
        expectedVersion: version,
        receivedAt: message.receivedAt,
        extraction,
        location,
        decision,
      });
      if (result.ok) {
        await send(ctx, message, result.messages);
        return;
      }
      // Another message changed the conversation meanwhile: start over.
    }
    await send(ctx, message, [messages.tryAgain()]);
  },
});

async function resolveLocation(
  message: IncomingMessage,
): Promise<ResolvedLocation | null> {
  if (message.location) {
    const { lat, lng } = message.location;
    return {
      lat,
      lng,
      address: `Local marcado no mapa (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
      precise: true,
    };
  }
  return null;
}
