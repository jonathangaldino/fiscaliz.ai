import { describe, expect, it } from "vitest";
import { hashCitizenId } from "./citizenHash";

describe("hashCitizenId", () => {
  it("is stable for the same input", async () => {
    expect(await hashCitizenId("whatsapp", "5543999990000")).toBe(
      await hashCitizenId("whatsapp", "5543999990000"),
    );
  });

  it("separates channels and never contains the raw id", async () => {
    const whatsapp = await hashCitizenId("whatsapp", "5543999990000");
    const simulator = await hashCitizenId("simulator", "5543999990000");
    expect(whatsapp).not.toBe(simulator);
    expect(whatsapp).not.toContain("5543999990000");
    expect(whatsapp).toMatch(/^[0-9a-f]{64}$/);
  });
});
