"use client";

import { useQuery } from "convex/react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { isAgencySlug, isCategoryKey } from "@/convex/lib/categories";
import { Filters } from "./Filters";
import { OccurrenceList } from "./OccurrenceList";

// MapLibre needs the browser (WebGL); never render it on the server.
const OccurrenceMap = dynamic(() => import("./OccurrenceMap"), { ssr: false });

export function Dashboard() {
  const all = useQuery(api.occurrences.listOpen);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Filters live in the URL so the view can be shared as a link.
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const rawCategory = params.get("categoria");
  const rawAgency = params.get("orgao");
  const category = rawCategory && isCategoryKey(rawCategory) ? rawCategory : null;
  const agency = rawAgency && isAgencySlug(rawAgency) ? rawAgency : null;

  const occurrences = useMemo(
    () =>
      all?.filter(
        (o) =>
          (!category || o.category === category) &&
          (!agency || o.agencySlug === agency),
      ),
    [all, category, agency],
  );

  function setFilters(next: { category: string | null; agency: string | null }) {
    const search = new URLSearchParams();
    if (next.category) search.set("categoria", next.category);
    if (next.agency) search.set("orgao", next.agency);
    const query = search.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    setSelectedId(null);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <section className="relative h-[55vh] md:h-auto md:flex-1">
        <OccurrenceMap
          occurrences={occurrences ?? []}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </section>
      <aside className="flex min-h-0 flex-1 flex-col border-zinc-200 md:w-96 md:flex-none md:border-l dark:border-zinc-800">
        <h2 className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold dark:border-zinc-800">
          Ocorrências abertas
          {occurrences && (
            <span className="ml-1 font-normal text-zinc-500">
              ({occurrences.length})
            </span>
          )}
        </h2>
        <Filters category={category} agency={agency} onChange={setFilters} />
        <div className="min-h-0 flex-1 overflow-y-auto">
          {occurrences === undefined ? (
            <p className="p-4 text-sm text-zinc-500">Carregando…</p>
          ) : (
            <OccurrenceList
              occurrences={occurrences}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </div>
      </aside>
    </div>
  );
}
