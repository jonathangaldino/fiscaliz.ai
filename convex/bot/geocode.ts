/**
 * Text address → coordinates: IBGE CNEFE first (ADR 0005), Google Geocoding
 * as the fallback. Runs inside actions only. Restricted to Apucarana, PR.
 */
import { STREETS } from "../cnefe/4101408";
import { displayName, houseNumber, indexStreets, locate, matchStreet, mentions } from "../lib/streets";
import type { GeocodeSource, ResolvedLocation } from "./types";

const STREET_INDEX = indexStreets(STREETS);

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

/** Where the location came from, for the reliability metrics (issue #37). */
export type Geocoded = {
  location: ResolvedLocation | null;
  source: GeocodeSource;
  typoDistance: number;
  ambiguous: boolean;
};

/**
 * Text address → coordinates. `location` is null when nothing more specific
 * than the city was found. Throws when the service fails.
 */
export async function geocodeAddress(address: string): Promise<Geocoded> {
  // The IBGE knows "Ítalo Ado Fontanini" from "ítalo fontanini"; Google does not.
  const { street, ambiguous, typoDistance } = matchStreet(address, STREET_INDEX);
  if (street) {
    const number = houseNumber(address, street.name);
    const name = displayName(street.name);
    return {
      location: { ...locate(street, number), address: number ? `${name}, ${number}` : name },
      source: typoDistance === 0 ? "cnefe_exact" : "cnefe_typo",
      typoDistance,
      ambiguous,
    };
  }
  const location = await googleGeocode(address);
  return { location, source: location ? "google" : "none", typoDistance: 0, ambiguous };
}

async function googleGeocode(address: string): Promise<ResolvedLocation | null> {
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

/**
 * True when every name word the citizen wrote shows up in the result.
 * shortcut: exact word match, so typos ("Osvaldo" vs "Oswaldo") are rejected
 * on partial matches; add edit distance if that shows up in practice.
 */
function mentionsResult(address: string, result: GeocodeResult): boolean {
  return mentions(result.address_components.map((c) => c.long_name).join(" "), address);
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
