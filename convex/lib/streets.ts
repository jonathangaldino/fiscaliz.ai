import { haversine, type LatLng } from "./geo";

/** House numbers of one street, sorted, with their coordinates (IBGE CNEFE). */
export type Street = { name: string; numbers: number[]; lats: number[]; lngs: number[] };

const STREET_WORDS = new Set(["rua", "avenida", "travessa", "alameda", "praca", "rodovia", "estrada", "dos", "das"]);

/** Interpolating across a longer gap is a guess, not a house number. */
const MAX_PRECISE_GAP_M = 200;

export const words = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/);

/**
 * The words that name the street: no street types or short abbreviations ("R", "Av").
 * Numbers count only before the first name word: "13" in "Rua 13 de Maio, 250",
 * not "40" in "Av. Curitiba, 40, Centro".
 */
export function nameWords(address: string): string[] {
  const all = words(address).filter((word) => word && !STREET_WORDS.has(word));
  const isNumber = (word: string) => /^\d+$/.test(word);
  const nameStart = all.findIndex((word) => !isNumber(word) && word.length >= 3);
  return all.filter((word, i) => (isNumber(word) ? i < nameStart : word.length >= 3));
}

/** True when every name word of the address shows up in the text. */
export function mentions(text: string, address: string): boolean {
  const found = new Set(words(text));
  return nameWords(address).every((word) => found.has(word));
}

export type IndexedStreet = Street & { words: string[]; wordSet: Set<string> };

/** Splits every street name once, at load, so a lookup does not re-normalize 1,500 names. */
export function indexStreets(streets: Street[]): IndexedStreet[] {
  return streets.map((street) => {
    const list = [...new Set(words(street.name).filter(Boolean))];
    return { ...street, words: list, wordSet: new Set(list) };
  });
}

export type Distance = (a: string, b: string, max: number) => number;

/**
 * Damerau-Levenshtein, optimal string alignment variant: insert, delete,
 * replace or swap two neighbor letters, 1 each. Stops early past `max`.
 */
export const damerauLevenshtein: Distance = (a, b, max) => {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let beforePrev: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        row[j] = Math.min(row[j], beforePrev[j - 2] + 1);
      }
      rowMin = Math.min(rowMin, row[j]);
    }
    if (rowMin > max) return max + 1;
    beforePrev = prev;
    prev = row;
  }
  return prev[b.length];
};

/** Typos tolerated per word: none up to 3 letters, 1 up to 7, 2 from 8 (ADR 0007). */
const typosAllowed = (word: string) => (word.length <= 3 ? 0 : word.length <= 7 ? 1 : 2);

/**
 * The only street holding every name word the citizen wrote.
 * "R ítalo fontanini 40" → "RUA ITALO ADO FONTANINI". Two matches → undefined.
 * Exact words first; only when no street matches, words may differ by a typo
 * ("oswaldo" for "osvaldo", "fotnanini" for "fontanini"). See ADR 0007.
 */
export function pickStreet<T extends IndexedStreet>(
  address: string,
  streets: T[],
  distance: Distance = damerauLevenshtein,
): T | undefined {
  const wanted = nameWords(address);
  if (wanted.length === 0) return undefined;
  const only = (matches: T[]) => (matches.length === 1 ? matches[0] : undefined);

  const exact = streets.filter((street) => wanted.every((word) => street.wordSet.has(word)));
  if (exact.length > 0) return only(exact);

  const close = (word: string, street: T) => {
    if (street.wordSet.has(word)) return true;
    const max = /^\d+$/.test(word) ? 0 : typosAllowed(word);
    return max > 0 && street.words.some((other) => distance(word, other, max) <= max);
  };
  return only(streets.filter((street) => wanted.every((word) => close(word, street))));
}

/** The last number of the address that is neither the CEP nor part of the street name ("Rua 13 de Maio"). */
export function houseNumber(address: string, streetName: string): number | undefined {
  const inName = new Set(words(streetName));
  const numbers = address.replace(/\b\d{5}-?\d{3}\b/g, "").match(/\b\d{1,5}\b/g) ?? [];
  const number = numbers.filter((n) => !inName.has(String(Number(n)))).at(-1);
  return number ? Number(number) : undefined;
}

/**
 * Coordinates of a house number. Exact when the IBGE has it; otherwise
 * interpolated between the nearest numbers on the same side of the street.
 */
export function locate(street: Street, number: number | undefined): LatLng & { precise: boolean } {
  const point = (i: number) => ({ lat: street.lats[i], lng: street.lngs[i] });
  const all = street.numbers.map((_, i) => i);
  if (number === undefined) return { ...point(all[Math.floor(all.length / 2)]), precise: false };

  const exact = all.find((i) => street.numbers[i] === number);
  if (exact !== undefined) return { ...point(exact), precise: true };

  const sameSide = all.filter((i) => street.numbers[i] % 2 === number % 2);
  const pool = sameSide.length >= 2 ? sameSide : all;
  const below = pool.findLast((i) => street.numbers[i] < number);
  const above = pool.find((i) => street.numbers[i] > number);
  if (below === undefined || above === undefined) {
    // Past either end of the street: the closest known number, as a street-level hit.
    return { ...point((below ?? above)!), precise: false };
  }
  const t = (number - street.numbers[below]) / (street.numbers[above] - street.numbers[below]);
  const a = point(below);
  const b = point(above);
  return {
    lat: a.lat + t * (b.lat - a.lat),
    lng: a.lng + t * (b.lng - a.lng),
    precise: haversine(a, b) <= MAX_PRECISE_GAP_M,
  };
}

/** "RUA ITALO ADO FONTANINI" → "Rua Italo Ado Fontanini" (IBGE names have no accents). */
export function displayName(name: string): string {
  return name
    .toLowerCase()
    .replace(/(^|\s)(\p{L})/gu, (_, space: string, letter: string) => space + letter.toUpperCase())
    .replace(/ (De|Da|Do|Dos|Das|E) /g, (word) => word.toLowerCase());
}
