import { describe, expect, it } from "vitest";
import { displayName, houseNumber, locate, pickStreet, type Street } from "./streets";

// Real CNEFE points of Rua Ítalo Ado Fontanini.
const italo: Street = {
  name: "RUA ITALO ADO FONTANINI",
  numbers: [30, 68, 103, 117],
  lats: [-23.558936, -23.559084, -23.559018, -23.558988],
  lngs: [-51.468147, -51.467367, -51.466884, -51.466193],
};
const curitiba = (type: string): Street => ({ ...italo, name: `${type} CURITIBA` });

describe("pickStreet", () => {
  it("finds the street from an incomplete name", () => {
    expect(pickStreet("R ítalo fontanini 40", [curitiba("RUA"), italo])).toBe(italo);
  });

  it("gives up when two streets match", () => {
    expect(pickStreet("curitiba 100", [curitiba("RUA"), curitiba("AVENIDA")])).toBeUndefined();
  });

  it("keeps a number that is part of the name", () => {
    const primeiro: Street = { ...italo, name: "RUA PRIMEIRO DE MAIO" };
    expect(pickStreet("Rua 13 de Maio, 250", [primeiro])).toBeUndefined();
  });

  it("gives up when a word is not in any street", () => {
    expect(pickStreet("ítalo fontanini, centro", [italo])).toBeUndefined();
    expect(pickStreet("R 40", [italo])).toBeUndefined();
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
