import { describe, expect, test } from "vitest";
import type { Extraction } from "../convex/bot/types";
import { newReport, score } from "./score";

function result(fields: Partial<Extraction>): Extraction {
  return {
    kind: "urban",
    emergencyTarget: null,
    outOfScopeTarget: null,
    category: null,
    description: null,
    address: null,
    occurredAt: null,
    publicSummary: null,
    ...fields,
  } as Extraction;
}

describe("score", () => {
  test("counts every emergency that does not come back as emergency, by kind", () => {
    const report = newReport();
    const fire = { text: "fogo", kind: "emergency" as const, emergencyTarget: "firefighters" };
    score(report, fire, result({ kind: "urban", category: "pavement" }));
    score(report, fire, result({ kind: "out_of_scope", outOfScopeTarget: "copel" }));
    score(report, fire, result({ kind: "invalid" }));
    score(report, fire, result({ kind: "emergency", emergencyTarget: "firefighters" }));

    expect(report.missedEmergencies).toEqual({ urban: 1, out_of_scope: 1, invalid: 1 });
    expect(report.byKind.emergency).toEqual({ total: 4, correct: 1 });
  });

  test("an API error counts as wrong in its category as well as its kind", () => {
    const report = newReport();
    const pothole = { text: "buraco", kind: "urban" as const, category: "pavement" };
    score(report, pothole, new Error("timeout"));
    score(report, pothole, result({ kind: "urban", category: "pavement" }));

    expect(report.byKind.urban).toEqual({ total: 2, correct: 1 });
    expect(report.byCategory.pavement).toEqual({ total: 2, correct: 1 });
    expect(report.errors).toEqual(['ERRO  "buraco": timeout']);
  });
});
