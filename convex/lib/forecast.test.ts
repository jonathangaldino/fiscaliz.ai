import { describe, expect, it } from "vitest";
import { AGENCY_SLUGS } from "./categories";
import {
  WEEKLY_CAPACITY,
  describeWindow,
  forecastWindow,
  planQueue,
} from "./forecast";

const DAY = 24 * 60 * 60 * 1000;
const at = (iso: string) => Date.parse(iso);
const NOW = at("2026-11-28T10:00:00-03:00"); // a Saturday

const pothole = (address: string, daysAgo = 3) => ({
  category: "pavement" as const,
  address,
  appeal: 1,
  openedAt: NOW - daysAgo * DAY,
});

describe("forecastWindow", () => {
  const describe_ = (expected: string) =>
    describeWindow(forecastWindow(at(expected), NOW));

  it("narrows from quarter to day as the date gets closer", () => {
    expect(describe_("2026-11-29T18:00:00-03:00")).toBe("até 29/11");
    expect(describe_("2026-12-09T09:00:00-03:00")).toBe("na semana de 07/12");
    expect(describe_("2027-01-20T09:00:00-03:00")).toBe("em janeiro de 2027");
    expect(describe_("2027-05-10T09:00:00-03:00")).toBe("no 2º trimestre de 2027");
  });

  it("returns windows that contain the expected date", () => {
    for (const days of [0.5, 1, 2, 3, 9, 14, 15, 40, 60, 61, 200]) {
      const expectedAt = NOW + days * DAY;
      const window = forecastWindow(expectedAt, NOW);
      expect(window.start).toBeLessThanOrEqual(expectedAt);
      expect(window.end).toBeGreaterThan(expectedAt);
    }
  });

  it("starts the week on Monday", () => {
    const window = forecastWindow(at("2026-12-06T12:00:00-03:00"), NOW); // Sunday
    expect(window).toMatchObject({
      precision: "week",
      start: at("2026-11-30T00:00:00-03:00"),
      end: at("2026-12-07T00:00:00-03:00"),
    });
  });
});

describe("planQueue", () => {
  it("has a capacity for every agency", () => {
    for (const slug of AGENCY_SLUGS) expect(WEEKLY_CAPACITY[slug]).toBeGreaterThan(0);
  });

  it("orders by priority and spaces the dates by the weekly capacity", () => {
    const rows = planQueue(
      [pothole("Rua D", 1), pothole("Avenida A"), pothole("Rua C", 2), pothole("Rua B", 9)],
      7,
      NOW,
    );
    expect(rows.map((row) => row.item.address)).toEqual([
      "Avenida A",
      "Rua B",
      "Rua C",
      "Rua D",
    ]);
    // Seven a week is one a day.
    expect(rows.map((row) => row.expectedAt)).toEqual(
      [1, 2, 3, 4].map((days) => NOW + days * DAY),
    );
    expect(rows.map((row) => row.window?.precision)).toEqual([
      "day",
      "day",
      "week",
      "week",
    ]);
  });

  it("widens the window for whoever is far down a slow queue", () => {
    const queue = Array.from({ length: 12 }, (_, i) => pothole(`Rua ${i}`, 12 - i));
    const rows = planQueue(queue, 1, NOW);
    expect(rows[0].window?.precision).toBe("week");
    expect(rows[5].window?.precision).toBe("month");
    expect(rows[11].window?.precision).toBe("quarter");
  });

  it("gives no date when the agency has no capacity", () => {
    expect(planQueue([pothole("Rua A")], 0, NOW)).toEqual([
      { item: pothole("Rua A") },
    ]);
  });
});
