import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

/** Returns true the first time a message id is seen, false on re-delivery. */
export const markProcessed = internalMutation({
  args: { messageId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { messageId }) => {
    const existing = await ctx.db
      .query("processedMessages")
      .withIndex("by_channel_message", (q) =>
        q.eq("channel", "whatsapp").eq("messageId", messageId),
      )
      .unique();
    if (existing) return false;
    await ctx.db.insert("processedMessages", { channel: "whatsapp", messageId });
    return true;
  },
});
