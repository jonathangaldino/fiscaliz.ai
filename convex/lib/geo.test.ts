import { describe, expect, it } from "vitest";
import { APUCARANA_CENTER, haversine, isInsideApucarana } from "./geo";

describe("haversine", () => {
  it("is zero for the same point", () => {
    expect(haversine(APUCARANA_CENTER, APUCARANA_CENTER)).toBe(0);
  });

  it("measures ~111 km per degree of latitude", () => {
    const d = haversine({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });

  it("measures short distances in meters", () => {
    // ~0.00045 deg of latitude ≈ 50 m
    const d = haversine(APUCARANA_CENTER, {
      lat: APUCARANA_CENTER.lat + 0.00045,
      lng: APUCARANA_CENTER.lng,
    });
    expect(d).toBeGreaterThan(45);
    expect(d).toBeLessThan(55);
  });
});

describe("isInsideApucarana", () => {
  it.each([
    ["downtown", APUCARANA_CENTER],
    ["Pirapó district", { lat: -23.69, lng: -51.46 }],
  ])("accepts %s", (_, point) => {
    expect(isInsideApucarana(point)).toBe(true);
  });

  it.each([
    ["Arapongas", { lat: -23.4153, lng: -51.4244 }],
    ["Londrina", { lat: -23.3045, lng: -51.1696 }],
    ["Curitiba", { lat: -25.4284, lng: -49.2733 }],
    ["Cambira", { lat: -23.5889, lng: -51.5778 }],
  ])("rejects %s", (_, point) => {
    expect(isInsideApucarana(point)).toBe(false);
  });
});
