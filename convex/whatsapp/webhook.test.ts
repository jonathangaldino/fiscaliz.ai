import { describe, expect, it } from "vitest";
import { toGraphPayload } from "../bot/channels/whatsapp";
import { isValidSignature, parseWebhook } from "./webhook";
import { sign, statusPayload, webhookPayload } from "./webhook.fixtures";

describe("isValidSignature", () => {
  it("accepts the HMAC of the raw body", async () => {
    const body = '{"hello":"world"}';
    expect(await isValidSignature(body, await sign(body, "s3cret"), "s3cret")).toBe(true);
  });

  it.each([
    ["missing header", null],
    ["wrong prefix", "sha1=abc"],
    ["wrong value", `sha256=${"0".repeat(64)}`],
  ])("rejects %s", async (_, header) => {
    expect(await isValidSignature("{}", header, "s3cret")).toBe(false);
  });

  it("rejects a body changed after signing", async () => {
    const header = await sign('{"a":1}', "s3cret");
    expect(await isValidSignature('{"a":2}', header, "s3cret")).toBe(false);
  });
});

describe("parseWebhook", () => {
  it("reads text messages", () => {
    const [message] = parseWebhook(
      webhookPayload({ type: "text", text: { body: "Buraco na rua" } }),
    );
    expect(message).toMatchObject({
      channel: "whatsapp",
      externalId: "5543999990000",
      messageId: "wamid.1",
      text: "Buraco na rua",
      receivedAt: 1_763_650_000_000,
    });
  });

  it("reads native location pins", () => {
    const [message] = parseWebhook(
      webhookPayload({
        type: "location",
        location: { latitude: -23.55, longitude: -51.46 },
      }),
    );
    expect(message.location).toEqual({ lat: -23.55, lng: -51.46 });
  });

  it("reads SIM/NÃO button replies", () => {
    const [message] = parseWebhook(
      webhookPayload({
        type: "interactive",
        interactive: { type: "button_reply", button_reply: { id: "yes", title: "SIM" } },
      }),
    );
    expect(message.button).toBe("yes");
  });

  it("flags media the bot does not handle", () => {
    const [message] = parseWebhook(webhookPayload({ type: "image" }));
    expect(message.unsupported).toBe(true);
  });

  it("ignores status notifications", () => {
    expect(parseWebhook(statusPayload())).toEqual([]);
  });

  it("ignores payloads from other products", () => {
    expect(parseWebhook({ object: "page" })).toEqual([]);
  });
});

describe("toGraphPayload", () => {
  it("sends plain text", () => {
    expect(toGraphPayload("55439", { text: "oi" })).toMatchObject({
      type: "text",
      text: { body: "oi" },
    });
  });

  it("sends SIM/NÃO as reply buttons", () => {
    const payload = toGraphPayload("55439", {
      text: "Posso registrar?",
      buttons: [
        { id: "yes", title: "SIM" },
        { id: "no", title: "NÃO" },
      ],
    });
    expect(payload).toMatchObject({
      type: "interactive",
      interactive: {
        type: "button",
        action: {
          buttons: [
            { type: "reply", reply: { id: "yes", title: "SIM" } },
            { type: "reply", reply: { id: "no", title: "NÃO" } },
          ],
        },
      },
    });
  });
});

describe("parseWebhook: audio", () => {
  it("keeps the media id of voice notes for transcription", () => {
    const [message] = parseWebhook(
      webhookPayload({ type: "audio", audio: { id: "media-1", mime_type: "audio/ogg" } }),
    );
    expect(message.audioMediaId).toBe("media-1");
    expect(message.unsupported).toBeUndefined();
  });
});
