import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { buttonValidator } from "./validators";

// Random UUID generated in the browser. Not personal data.
const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const MAX_TEXT_LENGTH = 1000;

function assertSession(sessionId: string) {
  if (!SESSION_ID.test(sessionId)) throw new ConvexError("Sessão inválida");
}

/** The citizen side of the simulator: what WhatsApp would deliver. */
export const send = mutation({
  args: {
    sessionId: v.string(),
    text: v.optional(v.string()),
    location: v.optional(v.object({ lat: v.number(), lng: v.number() })),
    button: v.optional(v.union(v.literal("yes"), v.literal("no"))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertSession(args.sessionId);
    const text = args.text?.trim().slice(0, MAX_TEXT_LENGTH) || undefined;
    if (!text && !args.location && !args.button) {
      throw new ConvexError("Mensagem vazia");
    }

    const now = Date.now();
    await ctx.db.insert("simulatorMessages", {
      sessionId: args.sessionId,
      author: "citizen",
      text:
        text ??
        (args.button === "yes"
          ? "SIM"
          : args.button === "no"
            ? "NÃO"
            : "📍 Local marcado no mapa"),
      createdAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.bot.handleIncoming.handleIncoming, {
      message: {
        channel: "simulator",
        externalId: args.sessionId,
        receivedAt: now,
        text,
        location: args.location,
        button: args.button,
      },
    });
    return null;
  },
});

export const messages = query({
  args: { sessionId: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("simulatorMessages"),
      author: v.union(v.literal("citizen"), v.literal("bot")),
      text: v.string(),
      buttons: v.optional(v.array(buttonValidator)),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, { sessionId }) => {
    assertSession(sessionId);
    const docs = await ctx.db
      .query("simulatorMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
    return docs.map(({ _id, author, text, buttons, createdAt }) => ({
      _id,
      author,
      text,
      buttons,
      createdAt,
    }));
  },
});
