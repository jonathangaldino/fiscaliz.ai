import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { geocodeAddress, reverseGeocode, shortAddress } from "./geocode";

function mockGoogle(body: unknown, status = 200) {
  const fetchMock = vi.fn<(url: string | URL) => Promise<Response>>(
    async () => new Response(JSON.stringify(body), { status }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const result = (locationType: string, types = ["street_address"]) => ({
  status: "OK",
  results: [
    {
      formatted_address: "Av. Curitiba, 100 - Centro, Apucarana - PR, 86800-000, Brasil",
      geometry: { location: { lat: -23.55, lng: -51.46 }, location_type: locationType },
      types,
    },
  ],
});

beforeEach(() => vi.stubEnv("GOOGLE_MAPS_API_KEY", "test-key"));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("geocodeAddress", () => {
  it("restricts the search to Apucarana", async () => {
    const fetchMock = mockGoogle(result("ROOFTOP"));
    await geocodeAddress("Avenida Curitiba 100");
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get("components")).toBe(
      "locality:Apucarana|administrative_area:PR|country:BR",
    );
  });

  it.each([
    ["ROOFTOP", true],
    ["RANGE_INTERPOLATED", true],
    ["GEOMETRIC_CENTER", false],
    ["APPROXIMATE", false],
  ])("marks %s as precise=%s", async (type, precise) => {
    mockGoogle(result(type));
    expect(await geocodeAddress("Avenida Curitiba")).toMatchObject({
      precise,
      address: "Av. Curitiba, 100 - Centro",
    });
  });

  it("returns null when only the city matched", async () => {
    mockGoogle(result("APPROXIMATE", ["locality", "political"]));
    expect(await geocodeAddress("rua que não existe")).toBeNull();
  });

  it("returns null when nothing matched", async () => {
    mockGoogle({ status: "ZERO_RESULTS", results: [] });
    expect(await geocodeAddress("???")).toBeNull();
  });

  it("throws when the service fails", async () => {
    mockGoogle({ status: "OVER_QUERY_LIMIT", results: [] });
    await expect(geocodeAddress("Avenida Curitiba")).rejects.toThrow();
  });
});

describe("reverseGeocode", () => {
  it("returns a short address", async () => {
    mockGoogle(result("ROOFTOP"));
    expect(await reverseGeocode(-23.55, -51.46)).toBe("Av. Curitiba, 100 - Centro");
  });
});

describe("shortAddress", () => {
  it("keeps addresses outside Apucarana untouched apart from country", () => {
    expect(shortAddress("Rua A, 1 - Centro, Arapongas - PR, 86700-000, Brasil")).toBe(
      "Rua A, 1 - Centro, Arapongas - PR",
    );
  });
});
