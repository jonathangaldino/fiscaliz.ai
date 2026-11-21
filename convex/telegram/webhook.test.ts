import { describe, expect, it } from "vitest";
import { isValidSecret, parseUpdate } from "./webhook";
import { callbackUpdate, messageUpdate } from "./webhook.fixtures";

describe("isValidSecret", () => {
  it("accepts the configured secret", () => {
    expect(isValidSecret("s3cret", "s3cret")).toBe(true);
  });

  it.each([
    ["missing header", null],
    ["wrong value", "s3creT"],
    ["different length", "s3cret!"],
  ])("rejects %s", (_, header) => {
    expect(isValidSecret(header, "s3cret")).toBe(false);
  });
});

describe("parseUpdate", () => {
  it("reads text messages", () => {
    expect(parseUpdate(messageUpdate({ text: "Buraco na rua" }))).toMatchObject({
      channel: "telegram",
      externalId: "100200300",
      messageId: "1",
      text: "Buraco na rua",
      receivedAt: 1_763_650_000_000,
    });
  });

  it.each(["/start", "/start site"])("turns %s into a greeting", (text) => {
    expect(parseUpdate(messageUpdate({ text }))?.text).toBe("Oi");
  });

  it("reads location pins", () => {
    const message = parseUpdate(
      messageUpdate({ location: { latitude: -23.55, longitude: -51.46 } }),
    );
    expect(message?.location).toEqual({ lat: -23.55, lng: -51.46 });
  });

  it("keeps the file id of voice notes for transcription", () => {
    const message = parseUpdate(messageUpdate({ voice: { file_id: "file-1" } }));
    expect(message?.audioMediaId).toBe("file-1");
    expect(message?.unsupported).toBeUndefined();
  });

  it("flags media the bot does not handle", () => {
    expect(parseUpdate(messageUpdate({ photo: [{}] }))?.unsupported).toBe(true);
  });

  it("ignores group chats", () => {
    expect(parseUpdate(messageUpdate({ text: "oi" }, 1, "group"))).toBeNull();
  });

  it("ignores updates without an id or a message", () => {
    expect(parseUpdate({})).toBeNull();
    expect(parseUpdate({ update_id: 3, edited_message: {} })).toBeNull();
    expect(parseUpdate(null)).toBeNull();
  });

  it("reads SIM/NÃO button taps", () => {
    expect(parseUpdate(callbackUpdate("yes"))).toMatchObject({
      button: "yes",
      callbackQueryId: "cbq-1",
      externalId: "100200300",
    });
  });

  it("reads a verification tap", () => {
    expect(parseUpdate(callbackUpdate("verify:k57abc123:no"))?.verification).toEqual({
      occurrenceId: "k57abc123",
      answer: "no",
    });
  });

  it("flags an unknown tap as unsupported", () => {
    expect(parseUpdate(callbackUpdate("other"))?.unsupported).toBe(true);
  });
});
