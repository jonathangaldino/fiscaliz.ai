/**
 * Google Geocoding API. Runs inside actions only.
 * Forward geocoding is restricted to Apucarana, PR.
 */
import type { ResolvedLocation } from "./types";

const ENDPOINT = "https://maps.googleapis.com/maps/api/geocode/json";

type GeocodeResult = {
  formatted_address: string;
  geometry: {
    location: { lat: number; lng: number };
    location_type: "ROOFTOP" | "RANGE_INTERPOLATED" | "GEOMETRIC_CENTER" | "APPROXIMATE";
  };
  types: string[];
};

type GeocodeResponse = {
  status: string;
  results: GeocodeResult[];
  error_message?: string;
};

function apiKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("GOOGLE_MAPS_API_KEY is not set");
  return key;
}

async function call(params: Record<string, string>): Promise<GeocodeResponse> {
  const url = new URL(ENDPOINT);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("language", "pt-BR");
  url.searchParams.set("key", apiKey());
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Geocoding HTTP ${response.status}`);
  const body = (await response.json()) as GeocodeResponse;
  if (body.status !== "OK" && body.status !== "ZERO_RESULTS") {
    throw new Error(`Geocoding status ${body.status}`);
  }
  return body;
}

/** Results that only point to the city or the state are not a location. */
const TOO_BROAD = ["locality", "administrative_area_level_1", "administrative_area_level_2", "country"];

/**
 * Text address → coordinates. Returns null when nothing more specific than
 * the city was found. Throws when the service fails.
 */
export async function geocodeAddress(
  address: string,
): Promise<ResolvedLocation | null> {
  const body = await call({
    address,
    components: "locality:Apucarana|administrative_area:PR|country:BR",
    region: "br",
  });
  const result = body.results[0];
  if (!result || result.types.some((type) => TOO_BROAD.includes(type))) {
    return null;
  }
  const { location, location_type } = result.geometry;
  return {
    lat: location.lat,
    lng: location.lng,
    address: shortAddress(result.formatted_address),
    // Street number found → 50 m dedup radius; street only → wider radius.
    precise: location_type === "ROOFTOP" || location_type === "RANGE_INTERPOLATED",
  };
}

/** Pin → readable address. Falls back to coordinates if nothing is found. */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const body = await call({ latlng: `${lat},${lng}` });
  const result = body.results[0];
  return result
    ? shortAddress(result.formatted_address)
    : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

/** "Rua X, 10 - Centro, Apucarana - PR, 86800-000, Brasil" → "Rua X, 10 - Centro". */
export function shortAddress(formatted: string): string {
  return formatted
    .replace(/, Brasil$/, "")
    .replace(/, \d{5}-\d{3}$/, "")
    .replace(/, Apucarana - PR$/, "")
    .trim();
}
