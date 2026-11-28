/**
 * Priority of an occurrence: an explainable 0-100 score built from objective
 * factors, not only from how many people complained. Pure, so the panel, the
 * open data export and the forecast all rank the same way.
 *
 * Method and sources: docs/priorizacao.md and ADR 0011. The numbers below are
 * proposed defaults, meant to be reviewed by each agency.
 */
import type { CategoryKey } from "./categories";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Functional class of the road, after CTB art. 60. */
export const ROAD_CLASSES = ["arterial", "collector", "local", "rural"] as const;
export type RoadClass = (typeof ROAD_CLASSES)[number];

export const ROAD_CLASS_LABEL: Record<RoadClass, string> = {
  arterial: "Via arterial",
  collector: "Via coletora ou espaço de uso coletivo",
  local: "Via local",
  rural: "Via rural",
};

/** How many people a problem on this kind of road affects, 0 to 1. */
const EXPOSURE: Record<RoadClass, number> = {
  arterial: 1,
  collector: 0.7,
  local: 0.4,
  rural: 0.4,
};

/** Busier roads get a shorter reference deadline (risk matrix by hierarchy). */
const TARGET_FACTOR: Record<RoadClass, number> = {
  arterial: 0.5,
  collector: 0.75,
  local: 1,
  rural: 1.5,
};

const ARTERIAL = /^(avenida|av|rodovia|rod|br|pr|contorno|marginal|via expressa)\b/;
const RURAL = /^(estrada|sitio|fazenda|chacara|linha|gleba)\b|\bdistrito d[eo]\b|\bzona rural\b/;
const COLLECTOR = /^(praca|largo|terminal|parque|lago|alameda|calcadao|rodoviaria)\b/;

/**
 * Road class guessed from the street type in the address. Apucarana does not
 * publish its road hierarchy as data, so this is a heuristic: avenues and
 * highways are arterial, squares and terminals are collective spaces, roads
 * in the districts are rural, everything else is local.
 */
export function roadClassFromAddress(address: string): RoadClass {
  const text = address
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[.]/g, "")
    .trim();
  if (RURAL.test(text)) return "rural";
  if (ARTERIAL.test(text)) return "arterial";
  if (COLLECTOR.test(text)) return "collector";
  return "local";
}

export type CategoryPriorityProfile = {
  /** G of the GUT matrix: harm to people if nothing is done, 1 to 5. */
  gravity: 1 | 2 | 3 | 4 | 5;
  /** T of the GUT matrix: how fast it gets worse on its own, 1 to 5. */
  tendency: 1 | 2 | 3 | 4 | 5;
  /** Reference deadline on a local road, in days. */
  targetDays: number;
};

export const CATEGORY_PRIORITY: Record<CategoryKey, CategoryPriorityProfile> = {
  traffic_light: { gravity: 5, tendency: 2, targetDays: 2 },
  risk_area: { gravity: 5, tendency: 5, targetDays: 3 },
  pavement: { gravity: 4, tendency: 4, targetDays: 10 },
  drainage: { gravity: 4, tendency: 4, targetDays: 10 },
  traffic_signs: { gravity: 4, tendency: 2, targetDays: 7 },
  street_lighting: { gravity: 3, tendency: 1, targetDays: 5 },
  tree_removal: { gravity: 3, tendency: 2, targetDays: 7 },
  tree_assessment: { gravity: 3, tendency: 3, targetDays: 30 },
  rural_roads: { gravity: 3, tendency: 4, targetDays: 20 },
  environmental: { gravity: 3, tendency: 3, targetDays: 15 },
  urban_cleaning: { gravity: 2, tendency: 3, targetDays: 15 },
  public_transport: { gravity: 2, tendency: 2, targetDays: 15 },
  public_spaces: { gravity: 2, tendency: 2, targetDays: 30 },
  construction: { gravity: 2, tendency: 2, targetDays: 30 },
  cemeteries: { gravity: 1, tendency: 1, targetDays: 30 },
  rural_area: { gravity: 1, tendency: 1, targetDays: 30 },
  other: { gravity: 2, tendency: 2, targetDays: 30 },
};

export const PRIORITY_FACTORS = [
  "gravity",
  "urgency",
  "exposure",
  "appeal",
  "tendency",
] as const;
export type PriorityFactorKey = (typeof PRIORITY_FACTORS)[number];

/** Share of the score each factor can add. Sums to 100. */
export const PRIORITY_WEIGHTS: Record<PriorityFactorKey, number> = {
  gravity: 30,
  urgency: 25,
  exposure: 20,
  appeal: 15,
  tendency: 10,
};

export const PRIORITY_FACTOR_LABEL: Record<PriorityFactorKey, string> = {
  gravity: "Gravidade",
  urgency: "Tempo em aberto",
  exposure: "Circulação no local",
  appeal: "Apelo",
  tendency: "Tendência de piora",
};

export const PRIORITY_LEVELS = ["critical", "high", "medium", "low"] as const;
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

export const PRIORITY_LEVEL_LABEL: Record<PriorityLevel, string> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

const LEVEL_FLOOR: [PriorityLevel, number][] = [
  ["critical", 70],
  ["high", 50],
  ["medium", 30],
  ["low", 0],
];

// Age stops counting at twice the deadline, and appeal at this many people.
const URGENCY_CAP = 2;
const APPEAL_CAP = 50;

export type PriorityFactor = {
  key: PriorityFactorKey;
  /** How strong the factor is for this occurrence, 0 to 1. */
  value: number;
  /** Points it adds to the score: value × weight. */
  points: number;
};

export type Priority = {
  /** 0 to 100. */
  score: number;
  level: PriorityLevel;
  roadClass: RoadClass;
  /** Reference deadline for this category on this road class, in days. */
  targetDays: number;
  /** Whole days since the occurrence was opened. */
  ageDays: number;
  /** Open for longer than the reference deadline. */
  overdue: boolean;
  factors: PriorityFactor[];
};

export type PriorityInput = {
  category: CategoryKey;
  address: string;
  appeal: number;
  openedAt: number;
};

export function targetDaysFor(category: CategoryKey, roadClass: RoadClass): number {
  return Math.max(
    1,
    Math.round(CATEGORY_PRIORITY[category].targetDays * TARGET_FACTOR[roadClass]),
  );
}

export function computePriority(occurrence: PriorityInput, now: number): Priority {
  const profile = CATEGORY_PRIORITY[occurrence.category];
  const roadClass = roadClassFromAddress(occurrence.address);
  const targetDays = targetDaysFor(occurrence.category, roadClass);
  const age = Math.max(0, now - occurrence.openedAt) / DAY_MS;

  const values: Record<PriorityFactorKey, number> = {
    gravity: (profile.gravity - 1) / 4,
    urgency: Math.min(age / targetDays, URGENCY_CAP) / URGENCY_CAP,
    exposure: EXPOSURE[roadClass],
    // Logarithmic: the 2nd person counts more than the 50th, so the loudest
    // neighbourhood does not own the queue.
    appeal: Math.min(
      Math.log2(1 + Math.max(0, occurrence.appeal)) / Math.log2(1 + APPEAL_CAP),
      1,
    ),
    tendency: (profile.tendency - 1) / 4,
  };
  const factors = PRIORITY_FACTORS.map((key) => ({
    key,
    value: values[key],
    points: values[key] * PRIORITY_WEIGHTS[key],
  }));
  const score = Math.round(factors.reduce((sum, f) => sum + f.points, 0));
  const level = LEVEL_FLOOR.find(([, floor]) => score >= floor)![0];
  return {
    score,
    level,
    roadClass,
    targetDays,
    ageDays: Math.floor(age),
    overdue: age > targetDays,
    factors,
  };
}

/** Highest priority first; ties go to the oldest occurrence. */
export function byPriority<T extends PriorityInput>(now: number) {
  return (a: T, b: T) =>
    computePriority(b, now).score - computePriority(a, now).score ||
    a.openedAt - b.openedAt;
}
