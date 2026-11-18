import type { PublicOccurrence } from "../convex/occurrences";
import {
  CATEGORIES,
  isAgencySlug,
  isCategoryKey,
  type AgencySlug,
  type CategoryKey,
} from "../convex/lib/categories";

const STATUSES = ["open", "verifying", "resolved"] as const;
type Status = (typeof STATUSES)[number];

export type ExportFilters = {
  agency?: AgencySlug;
  category?: CategoryKey;
  status?: Status;
};

/** Reads the dashboard's filter names (orgao, categoria, status) from the URL. */
export function parseFilters(
  params: URLSearchParams,
): { filters: ExportFilters } | { error: string } {
  const agency = params.get("orgao");
  const category = params.get("categoria");
  const status = params.get("status");
  if (agency && !isAgencySlug(agency))
    return { error: `orgao inválido: ${agency}` };
  if (category && !isCategoryKey(category))
    return { error: `categoria inválida: ${category}` };
  if (status && !(STATUSES as readonly string[]).includes(status)) {
    return { error: `status inválido: ${status} (use ${STATUSES.join(", ")})` };
  }
  return {
    filters: {
      agency: (agency || undefined) as AgencySlug | undefined,
      category: (category || undefined) as CategoryKey | undefined,
      status: (status || undefined) as Status | undefined,
    },
  };
}

const iso = (ms: number | undefined) =>
  ms === undefined ? null : new Date(ms).toISOString();

function row(o: PublicOccurrence, origin: string) {
  return {
    id: o._id,
    category: o.category,
    categoryLabel: CATEGORIES[o.category].label,
    agency: o.agencySlug,
    status: o.status,
    address: o.address,
    summary: o.summary,
    appeal: o.appeal,
    openedAt: iso(o.openedAt),
    resolvedAt: iso(o.resolvedAt),
    url: `${origin}/ocorrencias/${o._id}`,
  };
}

export function toGeoJSON(occurrences: PublicOccurrence[], origin: string) {
  return {
    type: "FeatureCollection",
    features: occurrences.map((o) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [o.lng, o.lat] },
      properties: row(o, origin),
    })),
  };
}

const CSV_COLUMNS = [
  "id",
  "category",
  "categoryLabel",
  "agency",
  "status",
  "address",
  "summary",
  "appeal",
  "lat",
  "lng",
  "openedAt",
  "resolvedAt",
  "url",
] as const;

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(occurrences: PublicOccurrence[], origin: string): string {
  const lines = occurrences.map((o) => {
    const values: Record<string, unknown> = {
      ...row(o, origin),
      lat: o.lat,
      lng: o.lng,
    };
    return CSV_COLUMNS.map((column) => csvCell(values[column])).join(",");
  });
  return [CSV_COLUMNS.join(","), ...lines].join("\r\n") + "\r\n";
}
