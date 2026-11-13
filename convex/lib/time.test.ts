import { describe, expect, it } from "vitest";
import { startOfDayInBrasilia } from "./time";

describe("startOfDayInBrasilia", () => {
  it("returns midnight in Brasília", () => {
    expect(startOfDayInBrasilia(Date.parse("2026-11-20T15:00:00-03:00"))).toBe(
      Date.parse("2026-11-20T00:00:00-03:00"),
    );
  });

  it("uses the Brasília day, not the UTC day", () => {
    // 23:30 in Brasília is already the next day in UTC.
    expect(startOfDayInBrasilia(Date.parse("2026-11-20T23:30:00-03:00"))).toBe(
      Date.parse("2026-11-20T00:00:00-03:00"),
    );
    expect(startOfDayInBrasilia(Date.parse("2026-11-21T00:00:00-03:00"))).toBe(
      Date.parse("2026-11-21T00:00:00-03:00"),
    );
  });
});
