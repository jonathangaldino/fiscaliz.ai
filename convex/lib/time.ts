const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
// Brazil has had no daylight saving time since 2019: Brasília is UTC-3.
const BRASILIA_OFFSET_MS = -3 * HOUR_MS;

/** Midnight in Brasília (as a UTC timestamp) of the day containing `ms`. */
export function startOfDayInBrasilia(ms: number): number {
  const local = ms + BRASILIA_OFFSET_MS;
  return local - (((local % DAY_MS) + DAY_MS) % DAY_MS) - BRASILIA_OFFSET_MS;
}
