import { describe, expect, it } from "vitest";
import { toTelegramHtml, toTelegramPayload } from "./telegram";

describe("toTelegramHtml", () => {
  it("turns *bold* into <b> and escapes HTML", () => {
    expect(toTelegramHtml("Ligue *SAMU: 192* <já> & pronto")).toBe(
      "Ligue <b>SAMU: 192</b> &lt;já&gt; &amp; pronto",
    );
  });

  it("leaves a lone asterisk alone", () => {
    expect(toTelegramHtml("nota 5*")).toBe("nota 5*");
  });
});

describe("toTelegramPayload", () => {
  it("sends plain text without a keyboard", () => {
    const payload = toTelegramPayload("100", { text: "oi" });
    expect(payload).toEqual({ chat_id: "100", text: "oi", parse_mode: "HTML" });
  });

  it("sends SIM/NÃO as inline buttons in one row", () => {
    const payload = toTelegramPayload("100", {
      text: "Posso registrar?",
      buttons: [
        { id: "yes", title: "SIM" },
        { id: "no", title: "NÃO" },
      ],
    });
    expect(payload.reply_markup).toEqual({
      inline_keyboard: [
        [
          { text: "SIM", callback_data: "yes" },
          { text: "NÃO", callback_data: "no" },
        ],
      ],
    });
  });

  it("caps long texts", () => {
    expect(toTelegramPayload("100", { text: "a".repeat(5000) }).text).toHaveLength(4096);
  });
});
