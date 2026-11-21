import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import schema from "./schema";
import { modules } from "./test.setup";
import { messageUpdate } from "./telegram/webhook.fixtures";

const SECRET = "webhook-secret";

beforeEach(() => vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", SECRET));
afterEach(() => vi.unstubAllEnvs());

function post(t: ReturnType<typeof convexTest>, payload: unknown, secret = SECRET) {
  return t.fetch("/telegram", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-telegram-bot-api-secret-token": secret,
    },
    body: JSON.stringify(payload),
  });
}

const scheduledCount = (t: ReturnType<typeof convexTest>) =>
  t.run(async (ctx) => (await ctx.db.system.query("_scheduled_functions").collect()).length);

describe("POST /telegram", () => {
  const text = messageUpdate({ text: "Buraco na rua" });

  it("rejects a wrong secret with 401", async () => {
    const t = convexTest(schema, modules);
    const response = await post(t, text, "wrong-secret");
    expect(response.status).toBe(401);
    expect(await scheduledCount(t)).toBe(0);
  });

  it("answers 200 and schedules processing in the background", async () => {
    const t = convexTest(schema, modules);
    const response = await post(t, text);
    expect(response.status).toBe(200);
    expect(await scheduledCount(t)).toBe(1);
  });

  it("ignores a re-delivered update id", async () => {
    const t = convexTest(schema, modules);
    await post(t, text);
    const again = await post(t, text);
    expect(again.status).toBe(200);
    expect(await scheduledCount(t)).toBe(1);
  });

  it("ignores group chats", async () => {
    const t = convexTest(schema, modules);
    const response = await post(t, messageUpdate({ text: "oi" }, 5, "group"));
    expect(response.status).toBe(200);
    expect(await scheduledCount(t)).toBe(0);
  });

  it("no longer serves the WhatsApp webhook", async () => {
    const t = convexTest(schema, modules);
    const response = await t.fetch("/whatsapp", { method: "POST", body: "{}" });
    expect(response.status).toBe(404);
  });
});
