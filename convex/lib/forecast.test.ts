import { describe, expect, it } from "vitest";
import { AGENCY_SLUGS, CATEGORY_KEYS } from "./categories";
import {
  AGENCY_PLANS,
  UNIT_COST,
  describeWindow,
  endOfFiscalYear,
  fiscalYearOf,
  forecastWindow,
  planQueue,
  type AgencyPlan,
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

describe("fiscal year", () => {
  it("follows the calendar in Brasília, not in UTC", () => {
    const newYearsEve = at("2026-12-31T23:30:00-03:00");
    expect(fiscalYearOf(newYearsEve)).toBe(2026);
    expect(endOfFiscalYear(newYearsEve)).toBe(at("2027-01-01T00:00:00-03:00"));
  });
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
  const plan: AgencyPlan = { annualBudget: 10_000, spent: 6_400, monthlyCapacity: 9_000 };

  it("has a plan for every agency and a cost for every category", () => {
    for (const slug of AGENCY_SLUGS) expect(AGENCY_PLANS[slug]).toBeDefined();
    for (const key of CATEGORY_KEYS) expect(UNIT_COST[key]).toBeGreaterThan(0);
  });

  it("funds in priority order until the budget ends: Y fit, Y+1 does not", () => {
    // R$ 3,600 left and R$ 1,200 per pothole: three fit, the fourth does not.
    const queue = planQueue(
      [pothole("Rua D", 1), pothole("Avenida A"), pothole("Rua C", 2), pothole("Rua B", 9)],
      plan,
      NOW,
    );
    expect(queue.rows.map((row) => [row.item.address, row.status])).toEqual([
      ["Avenida A", "funded"],
      ["Rua B", "funded"],
      ["Rua C", "funded"],
      ["Rua D", "over_budget"],
    ]);
    expect(queue).toMatchObject({
      fiscalYear: 2026,
      remaining: 3_600,
      fundedCount: 3,
      fundedCost: 3_600,
      deferredCount: 1,
      deferredCost: 1_200,
    });
    expect(queue.rows[3].window).toBeUndefined();
  });

  it("expects each funded occurrence later than the one before it", () => {
    const { rows } = planQueue(
      [pothole("Rua A"), pothole("Rua B"), pothole("Rua C")],
      plan,
      NOW,
    );
    // 1,200 of 9,000 a month is 4 days of work.
    expect(rows[0].expectedAt).toBe(NOW + 4 * DAY);
    expect(rows[1].expectedAt).toBe(NOW + 8 * DAY);
    expect(rows[2].expectedAt).toBe(NOW + 12 * DAY);
  });

  it("skips what does not fit so a cheaper occurrence can still be funded", () => {
    const road = { ...pothole("Estrada X", 60), category: "rural_roads" as const };
    const { rows } = planQueue([road, pothole("Rua A", 1)], plan, NOW);
    expect(rows.map((row) => row.status)).toEqual(["over_budget", "funded"]);
    expect(rows[1].expectedAt).toBe(NOW + 4 * DAY);
  });

  it("defers to next year what the crews cannot reach before it ends", () => {
    const slow: AgencyPlan = { annualBudget: 10_000, spent: 0, monthlyCapacity: 600 };
    const { rows } = planQueue([pothole("Rua A")], slow, NOW);
    expect(rows[0].status).toBe("over_capacity");
  });

  it("funds nothing when the budget is spent or there is no capacity", () => {
    const spent: AgencyPlan = { annualBudget: 1_000, spent: 5_000, monthlyCapacity: 9_000 };
    expect(planQueue([pothole("Rua A")], spent, NOW)).toMatchObject({
      remaining: 0,
      fundedCount: 0,
    });
    const idle: AgencyPlan = { annualBudget: 10_000, spent: 0, monthlyCapacity: 0 };
    expect(planQueue([pothole("Rua A")], idle, NOW).rows[0].status).toBe(
      "over_capacity",
    );
  });
});
