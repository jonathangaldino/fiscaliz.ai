import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { internal } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";
import { FAKE_CHAT_ID } from "../telegram/webhook.fixtures";
import { transcribeTelegramAudio, transcribeWhatsAppAudio } from "./transcribe";

type Route = (url: string, init?: RequestInit) => Response | Promise<Response>;

function mockFetch(route: Route) {
  const calls: { url: string; init?: RequestInit }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);
      calls.push({ url, init });
      return route(url, init);
    }),
  );
  return calls;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

beforeEach(() => {
  vi.stubEnv("WHATSAPP_TOKEN", "test-token");
  vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "123");
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "tg-token");
  vi.stubEnv("ELEVENLABS_API_KEY", "test-eleven");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("transcribeWhatsAppAudio", () => {
  it("downloads the media and transcribes it in Portuguese", async () => {
    const calls = mockFetch((url) => {
      if (url.endsWith("/media-1")) {
        return json({ url: "https://lookaside.example/audio", mime_type: "audio/ogg" });
      }
      if (url === "https://lookaside.example/audio") {
        return new Response(new Uint8Array([1, 2, 3]));
      }
      if (url.includes("elevenlabs")) return json({ text: " Tem um buraco na rua " });
      return json({}, 404);
    });

    expect(await transcribeWhatsAppAudio("media-1")).toBe("Tem um buraco na rua");

    const scribe = calls.find((c) => c.url.includes("elevenlabs"));
    const form = scribe?.init?.body as FormData;
    expect(form.get("model_id")).toBe("scribe_v2");
    expect(form.get("language_code")).toBe("por");
    // The media download uses the WhatsApp token.
    const download = calls.find((c) => c.url === "https://lookaside.example/audio");
    expect(new Headers(download?.init?.headers).get("authorization")).toBe(
      "Bearer test-token",
    );
  });

  it("fails on an empty transcription", async () => {
    mockFetch((url) =>
      url.endsWith("/media-1")
        ? json({ url: "https://lookaside.example/audio", mime_type: "audio/ogg" })
        : url.includes("elevenlabs")
          ? json({ text: "" })
          : new Response(new Uint8Array([1])),
    );
    await expect(transcribeWhatsAppAudio("media-1")).rejects.toThrow();
  });
});

describe("transcribeTelegramAudio", () => {
  it("resolves the file path and downloads it with the bot token", async () => {
    const calls = mockFetch((url) => {
      if (url.endsWith("/getFile")) {
        return json({ ok: true, result: { file_path: "voice/file_1.oga", file_size: 3 } });
      }
      if (url === "https://api.telegram.org/file/bottg-token/voice/file_1.oga") {
        return new Response(new Uint8Array([1, 2, 3]));
      }
      if (url.includes("elevenlabs")) return json({ text: "Poste apagado" });
      return json({}, 404);
    });

    expect(await transcribeTelegramAudio("file-1")).toBe("Poste apagado");
    const getFile = calls.find((c) => c.url.endsWith("/getFile"));
    expect(getFile?.url).toBe("https://api.telegram.org/bottg-token/getFile");
    expect(JSON.parse(String(getFile?.init?.body))).toEqual({ file_id: "file-1" });
  });

  it("refuses a file that is too large before downloading", async () => {
    const calls = mockFetch(() =>
      json({ ok: true, result: { file_path: "voice/big.oga", file_size: 17 * 1024 * 1024 } }),
    );
    await expect(transcribeTelegramAudio("file-1")).rejects.toThrow("Audio too large");
    expect(calls).toHaveLength(1);
  });
});

describe("handleIncoming with audio", () => {
  it("asks to resend or write when transcription fails, storing nothing", async () => {
    const calls = mockFetch((url) =>
      url.endsWith("/sendMessage") ? json({ ok: true, result: {} }) : json({}, 500),
    );
    const t = convexTest(schema, modules);
    await t.action(internal.bot.handleIncoming.handleIncoming, {
      message: {
        channel: "telegram",
        externalId: String(FAKE_CHAT_ID),
        messageId: "7",
        receivedAt: Date.now(),
        audioMediaId: "media-1",
      },
    });

    const sent = calls.filter((c) => c.url.endsWith("/sendMessage"));
    expect(sent).toHaveLength(1);
    expect(String(sent[0].init?.body)).toMatch(/não consegui entender o áudio/i);

    const stored = await t.run(async (ctx) => ({
      conversations: (await ctx.db.query("conversations").collect()).length,
      reports: (await ctx.db.query("reports").collect()).length,
    }));
    expect(stored).toEqual({ conversations: 0, reports: 0 });
  });
});
