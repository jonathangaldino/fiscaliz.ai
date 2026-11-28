import { describe, expect, it } from "vitest";
import { CATEGORY_KEYS } from "./categories";
import {
  CATEGORY_PRIORITY,
  PRIORITY_WEIGHTS,
  byPriority,
  computePriority,
  roadClassFromAddress,
  targetDaysFor,
} from "./priority";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-11-28T12:00:00-03:00");

const occurrence = (over: Partial<Parameters<typeof computePriority>[0]> = {}) => ({
  category: "pavement" as const,
  address: "Rua Ponta Grossa, Centro",
  appeal: 1,
  openedAt: NOW - DAY,
  ...over,
});

describe("roadClassFromAddress", () => {
  it("reads the street type, ignoring accents and case", () => {
    expect(roadClassFromAddress("Avenida Curitiba, Centro")).toBe("arterial");
    expect(roadClassFromAddress("AV. MINAS GERAIS, 1200")).toBe("arterial");
    expect(roadClassFromAddress("Rodovia BR-376, km 240")).toBe("arterial");
    expect(roadClassFromAddress("Praça Ruy Barbosa, Centro")).toBe("collector");
    expect(roadClassFromAddress("Terminal Urbano, Centro")).toBe("collector");
    expect(roadClassFromAddress("Rua Osvaldo Cruz, Centro")).toBe("local");
    expect(roadClassFromAddress("Cemitério Cristo Rei")).toBe("local");
  });

  it("puts district and dirt roads in the rural class", () => {
    expect(roadClassFromAddress("Estrada da Jangadinha, Distrito de Pirapó")).toBe(
      "rural",
    );
    expect(roadClassFromAddress("Avenida Brasil, Distrito de Pirapó")).toBe("rural");
  });
});

describe("computePriority", () => {
  it("has a profile for every category and weights that sum to 100", () => {
    for (const key of CATEGORY_KEYS) expect(CATEGORY_PRIORITY[key]).toBeDefined();
    const total = Object.values(PRIORITY_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });

  it("keeps the score between 0 and 100 and equal to the sum of its factors", () => {
    for (const category of CATEGORY_KEYS) {
      for (const appeal of [0, 1, 500]) {
        for (const days of [0, 3, 400]) {
          const p = computePriority(
            occurrence({ category, appeal, openedAt: NOW - days * DAY }),
            NOW,
          );
          expect(p.score).toBeGreaterThanOrEqual(0);
          expect(p.score).toBeLessThanOrEqual(100);
          const sum = p.factors.reduce((total, f) => total + f.points, 0);
          expect(p.score).toBe(Math.round(sum));
        }
      }
    }
  });

  it("ranks the main avenue above a local street for the same problem", () => {
    const avenue = computePriority(occurrence({ address: "Avenida Curitiba" }), NOW);
    const street = computePriority(occurrence({ address: "Rua Ponta Grossa" }), NOW);
    expect(avenue.score).toBeGreaterThan(street.score);
    expect(avenue.targetDays).toBeLessThan(street.targetDays);
  });

  it("ranks an old occurrence above a new one, up to twice the deadline", () => {
    const at = (days: number) =>
      computePriority(occurrence({ openedAt: NOW - days * DAY }), NOW);
    expect(at(8).score).toBeGreaterThan(at(1).score);
    expect(at(8).overdue).toBe(false);
    expect(at(11).overdue).toBe(true);
    expect(at(11).ageDays).toBe(11);
    expect(at(300).score).toBe(at(20).score);
  });

  it("counts appeal with diminishing returns", () => {
    const at = (appeal: number) => computePriority(occurrence({ appeal }), NOW).score;
    expect(at(2) - at(1)).toBeGreaterThan(at(21) - at(20));
    expect(at(5000)).toBe(at(50));
  });

  it("does not let appeal alone beat a graver, older problem", () => {
    const loud = computePriority(
      occurrence({ category: "cemeteries", address: "Cemitério Cristo Rei", appeal: 200 }),
      NOW,
    );
    const grave = computePriority(
      occurrence({
        category: "traffic_light",
        address: "Avenida Central do Paraná",
        appeal: 1,
        openedAt: NOW - 2 * DAY,
      }),
      NOW,
    );
    expect(grave.score).toBeGreaterThan(loud.score);
    expect(grave.level).toBe("critical");
  });

  it("gives a deadline of at least one day", () => {
    expect(targetDaysFor("traffic_light", "arterial")).toBe(1);
    expect(targetDaysFor("pavement", "arterial")).toBe(5);
    expect(targetDaysFor("pavement", "rural")).toBe(15);
  });
});

describe("byPriority", () => {
  it("sorts by score, then oldest first", () => {
    const a = occurrence({ address: "Rua A", openedAt: NOW - 2 * DAY });
    const b = occurrence({ address: "Avenida B", openedAt: NOW - 2 * DAY });
    const c = occurrence({ address: "Rua C", openedAt: NOW - 2 * DAY - 1000 });
    expect([a, b, c].sort(byPriority(NOW)).map((o) => o.address)).toEqual([
      "Avenida B",
      "Rua C",
      "Rua A",
    ]);
  });
});
