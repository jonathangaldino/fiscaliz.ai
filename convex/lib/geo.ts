import apucarana from "./apucarana.geo.json";

export type LatLng = { lat: number; lng: number };

const EARTH_RADIUS_M = 6_371_000;

/** Great-circle distance in meters. */
export function haversine(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Ray casting. `ring` is a GeoJSON linear ring of [lng, lat] pairs. */
export function pointInRing(point: LatLng, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

const APUCARANA_RING = apucarana.geometry.coordinates[0];

/** Whether the point falls inside the municipality (IBGE 4101408). */
export function isInsideApucarana(point: LatLng): boolean {
  return pointInRing(point, APUCARANA_RING);
}

/** Downtown Apucarana, used as the initial map view. */
export const APUCARANA_CENTER: LatLng = { lat: -23.5508, lng: -51.4608 };
