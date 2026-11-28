/**
 * Furniture pickup rules (ADR 0011), pure so they are easy to test.
 * A pickup request is not a report: no appeal, no 30% verification, and
 * requests group by exact street and number, not by radius.
 */
import { haversine, type LatLng } from "./geo";

export const PICKUP_ITEMS = [
  "furniture",
  "mattress",
  "sofa",
  "appliance",
  "electronics",
] as const;
export type PickupItem = (typeof PICKUP_ITEMS)[number];

export const PICKUP_ITEM_LABEL: Record<PickupItem, string> = {
  furniture: "Móveis",
  mattress: "Colchões",
  sofa: "Sofás",
  appliance: "Eletrodomésticos",
  electronics: "Eletroeletrônicos",
};

const DAY_MS = 24 * 60 * 60 * 1000;
/** The bot asks the requesters whether the truck came. */
export const PICKUP_ASK_AFTER_MS = 3 * DAY_MS;
/** Without a single "yes", the point leaves the map. */
export const PICKUP_EXPIRE_AFTER_MS = 15 * DAY_MS;
/** A request without a street number joins a point within this radius of its pin. */
export const PICKUP_PIN_RADIUS_M = 50;

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * "Rua Galdino Gluck Junior, 60 - Centro" → "rua galdino gluck junior 60".
 * The geocoded address already has no complement. Undefined without a street
 * number: then the request groups by pin.
 */
export function pickupAddressKey(address: string): string | undefined {
  const [streetAndNumber] = address.split(" - ");
  const key = normalize(streetAndNumber);
  return /\s\d+[a-z]?$/.test(key) ? key : undefined;
}

/** The waiting point this request joins, if any. */
export function findPickupPoint<T extends LatLng & { addressKey?: string }>(
  waiting: T[],
  request: LatLng & { addressKey?: string },
): T | undefined {
  if (request.addressKey) {
    return waiting.find((p) => p.addressKey === request.addressKey);
  }
  return waiting
    .map((p) => ({ p, d: haversine(p, request) }))
    .filter(({ d }) => d <= PICKUP_PIN_RADIUS_M)
    .sort((a, b) => a.d - b.d)[0]?.p;
}

/** What the hourly sweep does with a waiting point. */
export function pickupDue(
  point: { openedAt: number; askedAt?: number },
  now: number,
): "ask" | "expire" | null {
  if (now - point.openedAt >= PICKUP_EXPIRE_AFTER_MS) return "expire";
  if (point.askedAt === undefined && now - point.openedAt >= PICKUP_ASK_AFTER_MS) {
    return "ask";
  }
  return null;
}

/** Calendar year in Brasília (UTC-3, no daylight saving since 2019). */
export function brasiliaYear(ms: number): number {
  return new Date(ms - 3 * 60 * 60 * 1000).getUTCFullYear();
}

/** 42, 2026 → "00042/2026". */
export function formatProtocol(sequence: number, year: number): string {
  return `${String(sequence).padStart(5, "0")}/${year}`;
}

/** Union of item lists, in the canonical order. */
export function mergeItems(a: readonly PickupItem[], b: readonly PickupItem[]): PickupItem[] {
  const set = new Set([...a, ...b]);
  return PICKUP_ITEMS.filter((item) => set.has(item));
}
