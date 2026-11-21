import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { channelValidator } from "../validators";

/** Returns true the first time a message id is seen, false on re-delivery. */
export const markProcessed = internalMutation({
  args: { channel: channelValidator, messageId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { channel, messageId }) => {
    const existing = await ctx.db
      .query("processedMessages")
      .withIndex("by_channel_message", (q) =>
        q.eq("channel", channel).eq("messageId", messageId),
      )
      .unique();
    if (existing) return false;
    await ctx.db.insert("processedMessages", { channel, messageId });
    return true;
  },
});
