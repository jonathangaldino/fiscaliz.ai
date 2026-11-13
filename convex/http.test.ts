import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import schema from "./schema";
import { modules } from "./test.setup";
import { sign, statusPayload, webhookPayload } from "./whatsapp/fixtures";

const SECRET = "app-secret";

beforeEach(() => {
  vi.stubEnv("WHATSAPP_APP_SECRET", SECRET);
  vi.stubEnv("WHATSAPP_VERIFY_TOKEN", "verify-me");
});
afterEach(() => vi.unstubAllEnvs());

async function post(t: ReturnType<typeof convexTest>, payload: unknown, secret = SECRET) {
  const body = JSON.stringify(payload);
  return t.fetch("/whatsapp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-hub-signature-256": await sign(body, secret),
    },
    body,
  });
}

const scheduledCount = (t: ReturnType<typeof convexTest>) =>
  t.run(async (ctx) => (await ctx.db.system.query("_scheduled_functions").collect()).length);

describe("GET /whatsapp", () => {
  it("answers Meta's verification challenge", async () => {
    const t = convexTest(schema, modules);
    const response = await t.fetch(
      "/whatsapp?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=42",
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("42");
  });

  it("refuses a wrong verify token", async () => {
    const t = convexTest(schema, modules);
    const response = await t.fetch(
      "/whatsapp?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=42",
    );
    expect(response.status).toBe(403);
  });
});

describe("POST /whatsapp", () => {
  const text = webhookPayload({ type: "text", text: { body: "Buraco na rua" } });

  it("rejects an invalid signature with 401", async () => {
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

  it("ignores a re-delivered message id", async () => {
    const t = convexTest(schema, modules);
    await post(t, text);
    const again = await post(t, text);
    expect(again.status).toBe(200);
    expect(await scheduledCount(t)).toBe(1);
  });

  it("ignores status notifications", async () => {
    const t = convexTest(schema, modules);
    const response = await post(t, statusPayload());
    expect(response.status).toBe(200);
    expect(await scheduledCount(t)).toBe(0);
  });
});
