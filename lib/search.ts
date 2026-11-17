/** Lowercase without accents, so "iluminacao" finds "Iluminação". */
export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/** Every word of the query must appear somewhere in the haystack. */
export function matchesSearch(haystack: string, query: string): boolean {
  const words = normalizeForSearch(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = normalizeForSearch(haystack);
  return words.every((word) => text.includes(word));
}
