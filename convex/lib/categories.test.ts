import { describe, expect, it } from "vitest";
import {
  AGENCIES,
  CATEGORIES,
  CATEGORY_KEYS,
  agencyForCategory,
  dialablePhone,
} from "./categories";

// 10-digit landline or 0800 toll-free line; an 11-digit mobile would be a person's number.
const INSTITUTIONAL_PHONE = /^(\d{10}|0800\d{7})$/;

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
      expect(dialablePhone(agency.phone)).toMatch(INSTITUTIONAL_PHONE);
    }
  });

  it("accepts landlines and toll-free lines but not mobiles", () => {
    expect("4334224000").toMatch(INSTITUTIONAL_PHONE);
    expect("08001006868").toMatch(INSTITUTIONAL_PHONE);
    expect(dialablePhone("(43) 99654-7528")).not.toMatch(INSTITUTIONAL_PHONE);
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
    ["0800-100-6868", "08001006868"],
  ])("dials %s as %s", (phone, digits) => {
    expect(dialablePhone(phone)).toBe(digits);
  });
});
