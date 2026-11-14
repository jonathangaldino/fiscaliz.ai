import { describe, expect, it } from "vitest";
import {
  AGENCIES,
  CATEGORIES,
  CATEGORY_KEYS,
  agencyForCategory,
  dialablePhone,
} from "./categories";

describe("categories", () => {
  it("has the 16 categories from COMPETENCIAS.md plus other", () => {
    expect(CATEGORY_KEYS).toHaveLength(17);
    expect(CATEGORY_KEYS).toContain("other");
  });

  it("maps every category except other to an agency", () => {
    for (const key of CATEGORY_KEYS) {
      const agency = agencyForCategory(key);
      if (key === "other") expect(agency).toBeNull();
      else expect(agency).not.toBeNull();
    }
  });

  it.each([
    ["pavement", "servicos-publicos"],
    ["street_lighting", "idepplan"],
    ["traffic_light", "segtran"],
    ["risk_area", "segtran"],
    ["tree_assessment", "meio-ambiente"],
    ["tree_removal", "servicos-publicos"],
    ["construction", "obras"],
    ["cemeteries", "aserfa"],
    ["rural_area", "agricultura"],
  ] as const)("routes %s to %s", (category, agency) => {
    expect(CATEGORIES[category].agency).toBe(agency);
  });

  it("keeps agency contacts institutional", () => {
    for (const agency of Object.values(AGENCIES)) {
      expect(agency.email).toMatch(/@apucarana\.pr\.gov\.br$/);
      expect(agency.url).toMatch(
        /^https:\/\/www\.apucarana\.pr\.gov\.br\/site\/orgaos-da-administracao\/[a-z-]+\/$/,
      );
      // Landlines only: a 9-digit mobile would be a person's number.
      expect(dialablePhone(agency.phone)).toMatch(/^\d{10}$/);
    }
  });

  it("gives each agency its own e-mail and page", () => {
    const agencies = Object.values(AGENCIES);
    expect(new Set(agencies.map((a) => a.email)).size).toBe(agencies.length);
    expect(new Set(agencies.map((a) => a.url)).size).toBe(agencies.length);
  });

  it.each([
    ["(43) 3427-8431", "4334278431"],
    ["(43) 3422-4000 (ramais 411 e 413)", "4334224000"],
    ["(43) 3422-4000 (Ramal 585)", "4334224000"],
  ])("dials %s as %s", (phone, digits) => {
    expect(dialablePhone(phone)).toBe(digits);
  });
});
