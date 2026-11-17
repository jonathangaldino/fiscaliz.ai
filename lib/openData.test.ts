import { describe, expect, it } from "vitest";
import type { PublicOccurrence } from "../convex/occurrences";
import { parseFilters, toCsv, toGeoJSON } from "./openData";

const occurrence = {
  _id: "abc",
  category: "pavement",
  agencySlug: "servicos-publicos",
  status: "open",
  lat: -23.55,
  lng: -51.46,
  address: "Rua X, 10",
  summary: 'Buraco "grande"\nna esquina',
  appeal: 3,
  openedAt: 0,
  source: "seed",
} as unknown as PublicOccurrence;

describe("parseFilters", () => {
  it("accepts the dashboard filter names", () => {
    const params = new URLSearchParams(
      "orgao=servicos-publicos&categoria=pavement&status=open",
    );
    expect(parseFilters(params)).toEqual({
      filters: {
        agency: "servicos-publicos",
        category: "pavement",
        status: "open",
      },
    });
  });

  it("rejects unknown values", () => {
    expect(parseFilters(new URLSearchParams("status=closed"))).toHaveProperty(
      "error",
    );
    expect(parseFilters(new URLSearchParams("orgao=nope"))).toHaveProperty(
      "error",
    );
    expect(parseFilters(new URLSearchParams("categoria=nope"))).toHaveProperty(
      "error",
    );
  });
});

describe("serializers", () => {
  it("writes GeoJSON points as [lng, lat]", () => {
    const geo = toGeoJSON([occurrence], "https://x.test");
    expect(geo.features[0].geometry.coordinates).toEqual([-51.46, -23.55]);
    expect(geo.features[0].properties.url).toBe(
      "https://x.test/ocorrencias/abc",
    );
  });

  it("quotes CSV cells with commas, quotes and newlines", () => {
    const [header, line] = toCsv([occurrence], "https://x.test").split("\r\n");
    expect(header.startsWith("id,category,")).toBe(true);
    expect(line).toContain('"Rua X, 10"');
    expect(line).toContain('"Buraco ""grande""\nna esquina"');
  });
});
