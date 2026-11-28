/**
 * Forecast of when an occurrence can be attended, from the agency's budget
 * and execution capacity. The queue is walked in priority order; each
 * occurrence either fits this year's budget or waits for the next one, and a
 * funded occurrence gets a window that narrows as the date gets closer.
 *
 * Pure. Method in docs/priorizacao.md and ADR 0012.
 */
import type { AgencySlug, CategoryKey } from "./categories";
import { byPriority, type PriorityInput } from "./priority";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
// Brazil has had no daylight saving time since 2019: Brasília is UTC-3.
const BRASILIA_OFFSET_MS = -3 * HOUR_MS;
// Capacity is given per month; a month of work is counted as 30 days.
const MONTH_MS = 30 * DAY_MS;

/** An agency's money and pace for urban upkeep in the current year, in BRL. */
export type AgencyPlan = {
  annualBudget: number;
  /** Already spent or committed this year. */
  spent: number;
  /** How much work the crews can deliver per month. */
  monthlyCapacity: number;
};

/**
 * ILLUSTRATIVE values for the demo (rule 9: synthetic data). Real ones come
 * from the city's annual budget law (LOA) and each agency's spending detail.
 */
export const AGENCY_PLANS: Record<AgencySlug, AgencyPlan> = {
  "servicos-publicos": { annualBudget: 1_800_000, spent: 1_788_500, monthlyCapacity: 15_000 },
  idepplan: { annualBudget: 600_000, spent: 590_000, monthlyCapacity: 30_000 },
  segtran: { annualBudget: 900_000, spent: 880_000, monthlyCapacity: 12_000 },
  "meio-ambiente": { annualBudget: 300_000, spent: 296_000, monthlyCapacity: 6_000 },
  obras: { annualBudget: 500_000, spent: 497_000, monthlyCapacity: 5_000 },
  aserfa: { annualBudget: 120_000, spent: 118_000, monthlyCapacity: 3_000 },
  agricultura: { annualBudget: 200_000, spent: 199_500, monthlyCapacity: 4_000 },
};

/**
 * ILLUSTRATIVE typical cost of attending one occurrence, in BRL. Real ones
 * come from price registration records and maintenance contracts.
 */
export const UNIT_COST: Record<CategoryKey, number> = {
  pavement: 1_200,
  rural_roads: 18_000,
  drainage: 800,
  urban_cleaning: 600,
  public_spaces: 2_500,
  street_lighting: 450,
  traffic_light: 3_000,
  traffic_signs: 700,
  public_transport: 2_000,
  risk_area: 25_000,
  tree_assessment: 300,
  tree_removal: 900,
  environmental: 500,
  construction: 1_500,
  cemeteries: 1_000,
  rural_area: 800,
  other: 1_000,
};

export const FORECAST_PRECISIONS = ["day", "week", "month", "quarter"] as const;
export type ForecastPrecision = (typeof FORECAST_PRECISIONS)[number];

/** `start` inclusive, `end` exclusive, both at midnight in Brasília. */
export type ForecastWindow = {
  precision: ForecastPrecision;
  start: number;
  end: number;
};

// The further away the expected date, the wider the window.
const DAY_HORIZON_MS = 2 * DAY_MS;
const WEEK_HORIZON_MS = 14 * DAY_MS;
const MONTH_HORIZON_MS = 60 * DAY_MS;

const local = (ms: number) => new Date(ms + BRASILIA_OFFSET_MS);
/** Midnight in Brasília of a calendar date, as a UTC timestamp. */
const brasiliaMidnight = (year: number, month: number, day: number) =>
  Date.UTC(year, month, day) - BRASILIA_OFFSET_MS;

export function fiscalYearOf(ms: number): number {
  return local(ms).getUTCFullYear();
}

export function endOfFiscalYear(ms: number): number {
  return brasiliaMidnight(fiscalYearOf(ms) + 1, 0, 1);
}

/** The window to announce for a date expected at `expectedAt`, seen from `now`. */
export function forecastWindow(expectedAt: number, now: number): ForecastWindow {
  const date = local(expectedAt);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const horizon = expectedAt - now;

  if (horizon <= DAY_HORIZON_MS) {
    const start = brasiliaMidnight(year, month, day);
    return { precision: "day", start, end: start + DAY_MS };
  }
  if (horizon <= WEEK_HORIZON_MS) {
    // Weeks run Monday to Sunday.
    const sinceMonday = (date.getUTCDay() + 6) % 7;
    const start = brasiliaMidnight(year, month, day - sinceMonday);
    return { precision: "week", start, end: start + 7 * DAY_MS };
  }
  if (horizon <= MONTH_HORIZON_MS) {
    return {
      precision: "month",
      start: brasiliaMidnight(year, month, 1),
      end: brasiliaMidnight(year, month + 1, 1),
    };
  }
  const quarter = Math.floor(month / 3);
  return {
    precision: "quarter",
    start: brasiliaMidnight(year, quarter * 3, 1),
    end: brasiliaMidnight(year, quarter * 3 + 3, 1),
  };
}

const TIME_ZONE = "America/Sao_Paulo";
const dayMonth = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: TIME_ZONE,
});
const monthYear = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: TIME_ZONE,
});

/** pt-BR phrase that completes "Previsão de atendimento: ...". */
export function describeWindow(window: ForecastWindow): string {
  switch (window.precision) {
    case "day":
      return `até ${dayMonth.format(window.start)}`;
    case "week":
      return `na semana de ${dayMonth.format(window.start)}`;
    case "month":
      return `em ${monthYear.format(window.start)}`;
    case "quarter": {
      const date = local(window.start);
      const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
      return `no ${quarter}º trimestre de ${date.getUTCFullYear()}`;
    }
  }
}

export type ForecastStatus =
  /** Fits this year's budget and the crews get to it this year. */
  | "funded"
  /** Its cost does not fit what is left of this year's budget. */
  | "over_budget"
  /** The money is there, but the crews only get to it after the year ends. */
  | "over_capacity";

export type QueueRow<T> = {
  item: T;
  cost: number;
  status: ForecastStatus;
  /** Only when funded. */
  expectedAt?: number;
  window?: ForecastWindow;
};

export type QueuePlan<T> = {
  /** In priority order. */
  rows: QueueRow<T>[];
  fiscalYear: number;
  /** Budget left before this queue. */
  remaining: number;
  fundedCount: number;
  fundedCost: number;
  deferredCount: number;
  deferredCost: number;
};

/**
 * Walks the queue in priority order. An occurrence that does not fit is left
 * for next year and skipped, so a cheaper one further down can still fit.
 */
export function planQueue<T extends PriorityInput>(
  items: T[],
  plan: AgencyPlan,
  now: number,
): QueuePlan<T> {
  const remaining = Math.max(0, plan.annualBudget - plan.spent);
  const yearEnd = endOfFiscalYear(now);
  let fundedCost = 0;
  let deferredCost = 0;

  const rows = [...items].sort(byPriority(now)).map((item): QueueRow<T> => {
    const cost = UNIT_COST[item.category];
    const total = fundedCost + cost;
    const expectedAt =
      plan.monthlyCapacity > 0
        ? now + (total / plan.monthlyCapacity) * MONTH_MS
        : Infinity;
    const status: ForecastStatus =
      total > remaining
        ? "over_budget"
        : expectedAt >= yearEnd
          ? "over_capacity"
          : "funded";
    if (status !== "funded") {
      deferredCost += cost;
      return { item, cost, status };
    }
    fundedCost = total;
    return { item, cost, status, expectedAt, window: forecastWindow(expectedAt, now) };
  });

  const fundedCount = rows.filter((row) => row.status === "funded").length;
  return {
    rows,
    fiscalYear: fiscalYearOf(now),
    remaining,
    fundedCount,
    fundedCost,
    deferredCount: rows.length - fundedCount,
    deferredCost,
  };
}
