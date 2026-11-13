import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";
import { outgoingMessageValidator } from "../../validators";

/** "Sends" bot messages to the simulator: the chat page subscribes to them. */
export const deliver = internalMutation({
  args: {
    sessionId: v.string(),
    messages: v.array(outgoingMessageValidator),
  },
  returns: v.null(),
  handler: async (ctx, { sessionId, messages }) => {
    const now = Date.now();
    for (const [index, message] of messages.entries()) {
      await ctx.db.insert("simulatorMessages", {
        sessionId,
        author: "bot",
        text: message.text,
        buttons: message.buttons,
        createdAt: now + index,
      });
    }
    return null;
  },
});
