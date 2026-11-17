"use client";

import { useQuery } from "convex/react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import {
  AGENCIES,
  CATEGORIES,
  isAgencySlug,
  isCategoryKey,
  type AgencySlug,
  type CategoryKey,
} from "@/convex/lib/categories";
import type { PublicOccurrence } from "@/convex/occurrences";
import { useMediaQuery } from "@/lib/media";
import { matchesSearch } from "@/lib/search";
import { CategoryBar } from "./CategoryBar";
import { AgencyFilter } from "./Filters";
import { OccurrenceList } from "./OccurrenceList";
import { SearchField } from "./SearchField";
import { Glyph } from "./ui/Glyph";

// MapLibre needs the browser (WebGL); never render it on the server.
const OccurrenceMap = dynamic(() => import("./OccurrenceMap"), { ssr: false });

/** Width of the floating panel on desktop, plus its margin. */
const PANEL_SPACE = 404;

function searchText(o: PublicOccurrence): string {
  const agency = o.agencySlug ? AGENCIES[o.agencySlug as AgencySlug].name : "";
  return `${o.summary} ${o.address} ${CATEGORIES[o.category].label} ${agency}`;
}

export function Dashboard() {
  const all = useQuery(api.occurrences.listActive);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const desktop = useMediaQuery("(min-width: 768px)");

  // Filters live in the URL so the view can be shared as a link.
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const rawCategory = params.get("categoria");
  const rawAgency = params.get("orgao");
  const category =
    rawCategory && isCategoryKey(rawCategory) ? rawCategory : null;
  const agency = rawAgency && isAgencySlug(rawAgency) ? rawAgency : null;

  // Agency and search apply first; the category counts are taken from here.
  const scoped = useMemo(
    () =>
      all?.filter(
        (o) =>
          (!agency || o.agencySlug === agency) &&
          matchesSearch(searchText(o), search),
      ),
    [all, agency, search],
  );

  const counts = useMemo(() => {
    const result: Partial<Record<CategoryKey, number>> = {};
    for (const o of scoped ?? []) {
      result[o.category] = (result[o.category] ?? 0) + 1;
    }
    return result;
  }, [scoped]);

  const occurrences = useMemo(
    () => scoped?.filter((o) => !category || o.category === category),
    [scoped, category],
  );

  function setFilters(next: {
    category: CategoryKey | null;
    agency: AgencySlug | null;
  }) {
    const query = new URLSearchParams();
    if (next.category) query.set("categoria", next.category);
    if (next.agency) query.set("orgao", next.agency);
    const value = query.toString();
    router.replace(value ? `${pathname}?${value}` : pathname, {
      scroll: false,
    });
    setSelectedId(null);
  }

  const filtered = Boolean(category || agency || search.trim());
  const count = occurrences?.length;

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <div className="absolute inset-0">
        <OccurrenceMap
          occurrences={occurrences ?? []}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            setSheetOpen(true);
          }}
          padding={
            desktop
              ? { top: 72, left: PANEL_SPACE, bottom: 110 }
              : { top: 72, bottom: 180 }
          }
        />
      </div>

      {/* Desktop: icon dock over the map, to the right of the panel. */}
      <div
        className="pointer-events-none absolute right-16 bottom-4 hidden justify-center md:flex"
        style={{ left: PANEL_SPACE }}
      >
        <CategoryBar
          variant="dock"
          counts={counts}
          selected={category}
          onChange={(next) => setFilters({ category: next, agency })}
          className="pointer-events-auto"
        />
      </div>

      {/* Panel: floating column on desktop, bottom sheet on the phone. */}
      <aside
        aria-label="Ocorrências"
        className={`glass-strong absolute inset-x-0 bottom-0 z-20 flex flex-col overflow-hidden rounded-t-panel transition-[height] duration-(--dur-slow) ease-out md:top-20 md:right-auto md:bottom-3 md:left-3 md:h-auto md:w-[380px] md:rounded-panel ${
          sheetOpen ? "h-[72dvh]" : "h-auto"
        }`}
      >
        <button
          type="button"
          onClick={() => setSheetOpen((open) => !open)}
          aria-expanded={sheetOpen}
          aria-controls="occurrence-list"
          className="flex w-full flex-col items-center pt-2 md:hidden"
        >
          <span aria-hidden className="h-1.5 w-10 rounded-full bg-fg/20" />
          <span className="sr-only">
            {sheetOpen ? "Recolher lista" : "Expandir lista"}
          </span>
        </button>

        <div className="space-y-3 px-4 pt-2 pb-3 md:pt-4">
          <div className="flex items-baseline justify-between gap-2">
            <h1 className="text-xl font-semibold tracking-tight">
              Ocorrências abertas
            </h1>
            <span
              className="text-sm text-muted tabular-nums"
              aria-live="polite"
              aria-atomic
            >
              {count === undefined
                ? ""
                : count === 1
                  ? "1 ocorrência"
                  : `${count} ocorrências`}
            </span>
          </div>
          <SearchField value={search} onChange={setSearch} />
        </div>

        <CategoryBar
          variant="row"
          counts={counts}
          selected={category}
          onChange={(next) => setFilters({ category: next, agency })}
          className={`md:hidden ${sheetOpen ? "" : "pb-[max(0.75rem,env(safe-area-inset-bottom))]"}`}
        />

        <div
          className={`px-4 pt-2 pb-3 md:pt-0 ${sheetOpen ? "" : "max-md:hidden"}`}
        >
          <AgencyFilter
            agency={agency}
            onChange={(next) => setFilters({ category, agency: next })}
          />
        </div>

        <div
          id="occurrence-list"
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-line pt-2 ${
            sheetOpen ? "" : "max-md:hidden"
          }`}
        >
          {occurrences === undefined ? (
            <p className="p-4 text-sm text-muted">Carregando…</p>
          ) : (
            <OccurrenceList
              occurrences={occurrences}
              selectedId={selectedId}
              onSelect={setSelectedId}
              emptyMessage={
                filtered
                  ? "Nenhuma ocorrência com esses filtros."
                  : "Nenhuma ocorrência aberta."
              }
            />
          )}
          {filtered && (
            <div className="px-4 pb-4">
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilters({ category: null, agency: null });
                }}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent-tint"
              >
                <Glyph name="close" size={14} />
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
