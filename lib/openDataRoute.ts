import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import type { PublicOccurrence } from "@/convex/occurrences";
import { parseFilters } from "./openData";

/** Shared handler for the open data routes: filters, fetches, serializes. */
export async function exportOccurrences(
  request: Request,
  contentType: string,
  serialize: (occurrences: PublicOccurrence[], origin: string) => string,
): Promise<Response> {
  const url = new URL(request.url);
  const parsed = parseFilters(url.searchParams);
  if ("error" in parsed) {
    return new Response(parsed.error, {
      status: 400,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  const occurrences = await fetchQuery(
    api.occurrences.listForExport,
    parsed.filters,
  );
  return new Response(serialize(occurrences, url.origin), {
    headers: {
      "content-type": contentType,
      "access-control-allow-origin": "*",
      // One minute at the CDN: open data, not a live feed.
      "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
