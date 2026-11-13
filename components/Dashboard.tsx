"use client";

import { useQuery } from "convex/react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { OccurrenceList } from "./OccurrenceList";

// MapLibre needs the browser (WebGL); never render it on the server.
const OccurrenceMap = dynamic(() => import("./OccurrenceMap"), { ssr: false });

export function Dashboard() {
  const occurrences = useQuery(api.occurrences.listOpen);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
