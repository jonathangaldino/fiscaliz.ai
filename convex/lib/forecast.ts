/**
 * Forecast of when an occurrence can be attended, from its position in the
 * agency queue and how many occurrences the agency attends per week. The
 * window narrows as the date gets closer.
 *
 * Pure. Method in docs/priorizacao.md and ADR 0012.
 */
import type { AgencySlug } from "./categories";
import { byPriority, type PriorityInput } from "./priority";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
// Brazil has had no daylight saving time since 2019: Brasília is UTC-3.
const BRASILIA_OFFSET_MS = -3 * HOUR_MS;

/**
 * ILLUSTRATIVE occurrences each agency attends per week, for the demo
 * (rule 9: synthetic data). Real ones come from the agency's own history.
 */
export const WEEKLY_CAPACITY: Record<AgencySlug, number> = {
  "servicos-publicos": 5,
  idepplan: 6,
  segtran: 3,
  "meio-ambiente": 2,
  obras: 1,
  aserfa: 1,
  agricultura: 1,
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

export type QueueRow<T> = {
  item: T;
  /** Missing when the agency has no capacity to forecast with. */
  expectedAt?: number;
  window?: ForecastWindow;
};

/**
 * The queue in priority order, each occurrence with the date the agency gets
 * to it at `weeklyCapacity` occurrences per week.
 */
export function planQueue<T extends PriorityInput>(
  items: T[],
  weeklyCapacity: number,
  now: number,
): QueueRow<T>[] {
  return [...items].sort(byPriority(now)).map((item, index) => {
    if (weeklyCapacity <= 0) return { item };
    const expectedAt = now + ((index + 1) / weeklyCapacity) * WEEK_MS;
    return { item, expectedAt, window: forecastWindow(expectedAt, now) };
  });
}
