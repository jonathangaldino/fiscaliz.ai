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
  address_components: { long_name: string }[];
  partial_match?: boolean;
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
  // Partial matches are Google guessing: "R ítalo fontanini" came back as "Rua Italiano".
  if (result.partial_match && !mentionsResult(address, result)) return null;
  const { location, location_type } = result.geometry;
  return {
    lat: location.lat,
    lng: location.lng,
    address: shortAddress(result.formatted_address),
    // Street number found → 50 m dedup radius; street only → wider radius.
    // A partial match may land on another number of the street (e.g. a shop at 455 for 40).
    precise:
      !result.partial_match &&
      (location_type === "ROOFTOP" || location_type === "RANGE_INTERPOLATED"),
  };
}

const STREET_WORDS = new Set(["rua", "avenida", "travessa", "alameda", "praca", "rodovia", "estrada", "dos", "das"]);

const words = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/);

/**
 * True when every name word the citizen wrote shows up in the result.
 * shortcut: exact word match, so typos ("Osvaldo" vs "Oswaldo") are rejected
 * on partial matches; add edit distance if that shows up in practice.
 */
function mentionsResult(address: string, result: GeocodeResult): boolean {
  const found = new Set(words(result.address_components.map((c) => c.long_name).join(" ")));
  return words(address)
    .filter((word) => word.length >= 3 && !/^\d+$/.test(word) && !STREET_WORDS.has(word))
    .every((word) => found.has(word));
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
