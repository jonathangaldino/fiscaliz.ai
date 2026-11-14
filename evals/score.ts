/** Tally logic for the triage eval, kept apart from the API calls so it can be tested. */
import type { Extraction } from "../convex/bot/types";

export type Fixture = {
  text: string;
  kind: Extraction["kind"];
  category?: string;
  emergencyTarget?: string;
  outOfScopeTarget?: string;
};

export type Tally = Record<string, { total: number; correct: number }>;

export type Report = {
  byKind: Tally;
  byCategory: Tally;
  errors: string[];
  /** Emergency fixtures that did not come back as emergency, by the kind they got. */
  missedEmergencies: Partial<Record<Extraction["kind"], number>>;
};

export function newReport(): Report {
  return { byKind: {}, byCategory: {}, errors: [], missedEmergencies: {} };
}

function count(tally: Tally, key: string, ok: boolean) {
  tally[key] ??= { total: 0, correct: 0 };
  tally[key].total++;
  if (ok) tally[key].correct++;
}

/** Records one fixture's outcome: the extraction, or the error the API call threw. */
export function score(report: Report, fixture: Fixture, outcome: Extraction | Error) {
  if (outcome instanceof Error) {
    report.errors.push(`ERRO  "${fixture.text}": ${outcome.message}`);
    count(report.byKind, fixture.kind, false);
    if (fixture.category) count(report.byCategory, fixture.category, false);
    return;
  }

  const kindOk = outcome.kind === fixture.kind;
  count(report.byKind, fixture.kind, kindOk);
  if (!kindOk) {
    report.errors.push(`kind  "${fixture.text}": esperado ${fixture.kind}, veio ${outcome.kind}`);
    if (fixture.kind === "emergency") {
      report.missedEmergencies[outcome.kind] = (report.missedEmergencies[outcome.kind] ?? 0) + 1;
    }
  }

  if (fixture.category) {
    const ok = outcome.category === fixture.category;
    count(report.byCategory, fixture.category, ok);
    if (!ok) {
      report.errors.push(
        `cat   "${fixture.text}": esperado ${fixture.category}, veio ${outcome.category}`,
      );
    }
  }
  for (const field of ["emergencyTarget", "outOfScopeTarget"] as const) {
    if (fixture[field] && outcome[field] !== fixture[field]) {
      report.errors.push(
        `${field} "${fixture.text}": esperado ${fixture[field]}, veio ${outcome[field]}`,
      );
    }
  }
}
