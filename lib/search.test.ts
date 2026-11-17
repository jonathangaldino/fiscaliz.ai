import { describe, expect, it } from "vitest";
import { matchesSearch, normalizeForSearch } from "./search";

describe("normalizeForSearch", () => {
  it("drops accents and case", () => {
    expect(normalizeForSearch("  Iluminação PÚBLICA ")).toBe(
      "iluminacao publica",
    );
  });
});

describe("matchesSearch", () => {
  const text =
    "Buraco grande · Avenida Curitiba, Centro · Secretaria de Serviços Públicos";

  it("matches every word in any order, without accents", () => {
    expect(matchesSearch(text, "curitiba buraco")).toBe(true);
    expect(matchesSearch(text, "servicos")).toBe(true);
  });

  it("fails when one word is missing", () => {
    expect(matchesSearch(text, "curitiba semaforo")).toBe(false);
  });

  it("accepts an empty query", () => {
    expect(matchesSearch(text, "   ")).toBe(true);
  });
});
