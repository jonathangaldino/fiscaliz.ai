import { describe, expect, it } from "vitest";
import {
  damerauLevenshtein,
  displayName,
  houseNumber,
  indexStreets,
  locate,
  pickStreet,
  type Street,
} from "./streets";

// Real CNEFE points of Rua Ítalo Ado Fontanini.
const italo: Street = {
  name: "RUA ITALO ADO FONTANINI",
  numbers: [30, 68, 103, 117],
  lats: [-23.558936, -23.559084, -23.559018, -23.558988],
  lngs: [-51.468147, -51.467367, -51.466884, -51.466193],
};
const curitiba = (type: string): Street => ({ ...italo, name: `${type} CURITIBA` });
const pick = (address: string, streets: Street[]) => pickStreet(address, indexStreets(streets))?.name;

describe("pickStreet", () => {
  it("finds the street from an incomplete name", () => {
    expect(pick("R ítalo fontanini 40", [curitiba("RUA"), italo])).toBe(italo.name);
  });

  it("gives up when two streets match", () => {
    expect(pick("curitiba 100", [curitiba("RUA"), curitiba("AVENIDA")])).toBeUndefined();
  });

  it("keeps a number that is part of the name", () => {
    const primeiro: Street = { ...italo, name: "RUA PRIMEIRO DE MAIO" };
    expect(pick("Rua 13 de Maio, 250", [primeiro])).toBeUndefined();
  });

  it("gives up when a word is not in any street", () => {
    expect(pick("ítalo fontanini, centro", [italo])).toBeUndefined();
    expect(pick("R 40", [italo])).toBeUndefined();
  });

  it.each([
    ["swapped letters", "rua ítalo fotnanini 40"],
    ["wrong letter", "rua ítalo fontanino 40"],
    ["missing letter", "rua ítalo fontnini 40"],
    ["two typos in a long word", "rua ítalo fotnanin 40"],
  ])("tolerates a typo: %s", (_, address) => {
    expect(pick(address, [curitiba("RUA"), italo])).toBe(italo.name);
  });

  it("prefers an exact match over a typo match", () => {
    const mario: Street = { ...italo, name: "RUA MARIO SOUZA" };
    const maria: Street = { ...italo, name: "RUA MARIA SOUZA" };
    expect(pick("rua maria souza 10", [mario, maria])).toBe(maria.name);
  });

  it("gives up when a typo fits two streets", () => {
    const mario: Street = { ...italo, name: "RUA MARIO SOUZA" };
    const maria: Street = { ...italo, name: "RUA MARIA SOUZA" };
    expect(pick("rua marie souza 10", [mario, maria])).toBeUndefined();
  });

  it("does not tolerate typos in short words or numbers", () => {
    const ana: Street = { ...italo, name: "RUA ANA NERI" };
    expect(pick("rua ane neri", [ana])).toBeUndefined();
    const primeiro: Street = { ...italo, name: "RUA 14 DE MAIO" };
    expect(pick("rua 13 de maio", [primeiro])).toBeUndefined();
  });
});

describe("damerauLevenshtein", () => {
  it.each([
    ["oswaldo", "osvaldo", 1],
    ["fotnanini", "fontanini", 1],
    ["fontanini", "fontnini", 1],
    ["italo", "italiano", 3],
  ])("%s → %s = %i", (a, b, distance) => {
    expect(damerauLevenshtein(a, b, 5)).toBe(distance);
  });

  it("stops past the limit", () => {
    expect(damerauLevenshtein("italo", "italiano", 1)).toBe(2);
  });
});

describe("houseNumber", () => {
  it.each([
    ["R ítalo fontanini 40", "RUA ITALO ADO FONTANINI", 40],
    ["Rua 13 de Maio, 250", "RUA 13 DE MAIO", 250],
    ["Rua 13 de Maio", "RUA 13 DE MAIO", undefined],
    ["Rua X, 40, 86800-350", "RUA X", 40],
  ])("%s → %s", (address, street, number) => {
    expect(houseNumber(address, street)).toBe(number);
  });
});

describe("locate", () => {
  it("uses the IBGE point when the number exists", () => {
    expect(locate(italo, 68)).toEqual({ lat: -23.559084, lng: -51.467367, precise: true });
  });

  it("interpolates between the neighbors on the same side", () => {
    // 40 is even: between 30 and 68, a quarter of the way.
    const { lat, lng, precise } = locate(italo, 40);
    expect(lat).toBeCloseTo(-23.558936 + (10 / 38) * (-23.559084 + 23.558936), 6);
    expect(lng).toBeCloseTo(-51.468147 + (10 / 38) * (-51.467367 + 51.468147), 6);
    expect(precise).toBe(true);
  });

  it("is not precise past the end of the street or without a number", () => {
    expect(locate(italo, 9000)).toMatchObject({ precise: false });
    expect(locate(italo, undefined)).toMatchObject({ precise: false });
  });

  it("is not precise across a long gap", () => {
    const far: Street = { name: "RUA X", numbers: [2, 1000], lats: [-23.55, -23.56], lngs: [-51.46, -51.46] };
    expect(locate(far, 500)).toMatchObject({ precise: false });
  });
});

describe("displayName", () => {
  it("title-cases IBGE names", () => {
    expect(displayName("RUA PROFESSOR JOAO CANDIDO DE OLIVEIRA")).toBe(
      "Rua Professor Joao Candido de Oliveira",
    );
  });
});
