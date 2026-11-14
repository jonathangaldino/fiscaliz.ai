/**
 * Street-name matching benchmark behind ADR 0007: exact words vs Levenshtein
 * vs Damerau-Levenshtein, on Apucarana's real CNEFE streets with synthetic typos.
 * Runs the production pickStreet; only the distance function changes.
 *
 *   npx tsx scripts/bench/street-match.ts
 */
import { STREETS } from "../../convex/cnefe/4101408";
import {
  damerauLevenshtein,
  type Distance,
  houseNumber,
  indexStreets,
  locate,
  pickStreet,
  type Street,
  words,
} from "../../convex/lib/streets";

/** Classic Levenshtein: a swap of neighbor letters costs 2. */
export const levenshtein: Distance = (a, b, max) => {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, row[j]);
    }
    if (rowMin > max) return max + 1;
    prev = row;
  }
  return prev[b.length];
};

/** Never close: pickStreet falls back to exact words only (the behavior before ADR 0007). */
const exactOnly: Distance = (_a, _b, max) => max + 1;

export const VARIANTS: Record<string, Distance> = {
  exato: exactOnly,
  levenshtein,
  damerau: damerauLevenshtein,
};

const PER_GROUP = 200;
const TYPES = new Set(["rua", "avenida", "travessa", "estrada", "rodovia", "praca", "alameda"]);
const LETTERS = [..."abcdefghijklmnopqrstuvwxyz"];

export type Case = { group: string; address: string; expected: string | null };

/** Deterministic: the same seed gives the same 1,600 addresses. */
export function dataset(seed = 42): Case[] {
  let state = seed;
  const rnd = () => (state = (state * 16807) % 2147483647) / 2147483647;
  const pick = <T>(list: T[]) => list[Math.floor(rnd() * list.length)];
  // Typos never touch the first letter, as on a phone keyboard people rarely miss it.
  const at = (w: string) => 1 + Math.floor(rnd() * (w.length - 2));

  const typos: Record<string, (w: string) => string> = {
    troca: (w) => {
      const i = at(w);
      const others = LETTERS.filter((c) => c !== w[i]);
      return w.slice(0, i) + pick(others) + w.slice(i + 1);
    },
    falta: (w) => {
      const i = at(w);
      return w.slice(0, i) + w.slice(i + 1);
    },
    sobra: (w) => {
      const i = at(w);
      return w.slice(0, i) + pick(LETTERS) + w.slice(i);
    },
    invertidas: (w) => {
      const i = at(w);
      if (i >= w.length - 1 || w[i] === w[i + 1]) return w;
      return w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2);
    },
    fonetico: (w) => {
      const rules: [RegExp, string][] = [
        [/w/, "v"], [/v/, "w"], [/s(?=[aeiou])/, "z"], [/z/, "s"], [/y/, "i"], [/i/, "y"],
        [/^h/, ""], [/th/, "t"], [/ss/, "s"], [/tt/, "t"], [/ll/, "l"], [/ph/, "f"],
      ];
      const usable = rules.filter(([re]) => re.test(w));
      if (usable.length === 0) return w;
      const [re, to] = pick(usable);
      return w.replace(re, to);
    },
    dois_erros: (w) => (w.length >= 8 ? typos.troca(typos.falta(w)) : w),
  };

  const body = (s: Street) => words(s.name).filter((w) => w && !TYPES.has(w));
  const named = STREETS.filter((s) => body(s).some((w) => w.length >= 4));
  const address = (s: Street, name: string) => {
    const type = words(s.name)[0];
    return `${rnd() < 0.5 ? `${type} ` : ""}${name} ${pick(s.numbers)}`;
  };

  const cases: Case[] = [];
  for (let i = 0; i < PER_GROUP; i++) {
    const s = pick(named);
    cases.push({ group: "sem_erro", address: address(s, body(s).join(" ")), expected: s.name });
  }
  for (const [group, typo] of Object.entries(typos)) {
    const minLength = group === "dois_erros" ? 8 : 4;
    for (let made = 0; made < PER_GROUP; ) {
      const s = pick(named);
      const name = body(s);
      const targets = name.flatMap((w, i) => (w.length >= minLength && !/^\d+$/.test(w) ? [i] : []));
      if (targets.length === 0) continue;
      const i = pick(targets);
      const wrong = typo(name[i]);
      if (wrong === name[i]) continue;
      cases.push({ group, address: address(s, name.with(i, wrong).join(" ")), expected: s.name });
      made++;
    }
  }
  // Streets that do not exist: a first name and a last name from two different streets.
  const index = indexStreets(STREETS);
  const longWords = (s: Street) => body(s).filter((w) => w.length >= 4 && !/^\d+$/.test(w));
  for (let made = 0; made < PER_GROUP; ) {
    const a = longWords(pick(named));
    const b = longWords(pick(named));
    if (a.length < 2 || b.length < 2) continue;
    const [first, last] = [a[0], b[b.length - 1]];
    if (first === last || index.some((s) => s.wordSet.has(first) && s.wordSet.has(last))) continue;
    cases.push({ group: "nao_existe", address: `rua ${first} ${last} ${10 + made}`, expected: null });
    made++;
  }
  return cases;
}

export type GroupResult = { certo: number; errado: number; nada: number; times: number[] };

/** Times one lookup end to end: name match + edit distance + house number position. */
export function run(cases: Case[], distance: Distance) {
  const index = indexStreets(STREETS);
  for (const c of cases.slice(0, 50)) pickStreet(c.address, index, distance); // JIT warm-up
  const groups: Record<string, GroupResult> = {};
  const wrong: string[] = [];
  for (const c of cases) {
    const start = performance.now();
    const street = pickStreet(c.address, index, distance);
    if (street) locate(street, houseNumber(c.address, street.name));
    const ms = performance.now() - start;
    const g = (groups[c.group] ??= { certo: 0, errado: 0, nada: 0, times: [] });
    g.times.push(ms);
    if (!street) g.nada++;
    else if (street.name === c.expected) g.certo++;
    else {
      g.errado++;
      wrong.push(`${c.group}: "${c.address}" → ${street.name}${c.expected ? ` (esperado ${c.expected})` : ""}`);
    }
  }
  return { groups, wrong };
}

export function quantile(times: number[], q: number): number {
  const sorted = [...times].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}
