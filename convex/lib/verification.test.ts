import { describe, expect, it } from "vitest";
import {
  parseVerifyButton,
  REVERIFY_LOCK_MS,
  verificationAvailableAt,
  verificationOutcome,
  verifyButtonId,
} from "./verification";

describe("verify button id", () => {
  it("round-trips", () => {
    expect(parseVerifyButton(verifyButtonId("k57abc", "yes"))).toEqual({
      occurrenceId: "k57abc",
      answer: "yes",
    });
  });

  it("rejects anything else", () => {
    expect(parseVerifyButton("yes")).toBeNull();
    expect(parseVerifyButton("verify:k57abc:maybe")).toBeNull();
    expect(parseVerifyButton("verify:../x:yes")).toBeNull();
    expect(parseVerifyButton(undefined)).toBeNull();
  });
});

describe("verificationOutcome", () => {
  it("resolves at 30% of the appeal", () => {
    expect(verificationOutcome({ yes: 3, no: 0 }, 10)).toBe("resolved");
    expect(verificationOutcome({ yes: 2, no: 0 }, 10)).toBeNull();
    expect(verificationOutcome({ yes: 1, no: 0 }, 1)).toBe("resolved");
  });

  it("reopens when NO outnumbers YES", () => {
    expect(verificationOutcome({ yes: 0, no: 1 }, 10)).toBe("open");
    expect(verificationOutcome({ yes: 3, no: 4 }, 10)).toBe("open");
  });

  it("keeps waiting on a tie below 30%", () => {
    expect(verificationOutcome({ yes: 1, no: 1 }, 10)).toBeNull();
    expect(verificationOutcome({ yes: 0, no: 0 }, 10)).toBeNull();
  });
});

describe("verificationAvailableAt", () => {
  it("is immediate when never reopened, 7 days after otherwise", () => {
    expect(verificationAvailableAt(undefined)).toBe(REVERIFY_LOCK_MS);
    expect(verificationAvailableAt(1000)).toBe(1000 + REVERIFY_LOCK_MS);
  });
});
