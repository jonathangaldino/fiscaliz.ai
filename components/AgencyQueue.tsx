"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { AGENCIES, CATEGORIES, isAgencySlug } from "@/convex/lib/categories";
import { formatDate } from "@/lib/format";
import { AgencyContact } from "./AgencyContact";

export function AgencyQueue({ slug }: { slug: string }) {
  const queue = useQuery(api.occurrences.listByAgency, { slug });

  if (!isAgencySlug(slug)) {
    return <p className="p-6 text-sm">Órgão não encontrado.</p>;
  }
  const agency = AGENCIES[slug];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold">{agency.name}</h1>
        <AgencyContact agency={agency} />
      </header>

      {queue === undefined ? (
        <p className="text-sm text-zinc-500">Carregando…</p>
      ) : queue === null ? (
        <p className="text-sm text-zinc-500">
          Órgão ainda não cadastrado. Rode o seed do Convex.
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <dt className="text-xs text-zinc-500">Ocorrências abertas</dt>
              <dd className="text-2xl font-semibold">{queue.openCount}</dd>
            </div>
            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <dt className="text-xs text-zinc-500">Apelo total</dt>
              <dd className="text-2xl font-semibold">{queue.totalAppeal}</dd>
            </div>
          </dl>

          <section>
            <h2 className="mb-2 text-sm font-semibold">
              Fila por apelo
            </h2>
            {queue.occurrences.length === 0 ? (
              <p className="text-sm text-zinc-500">Nenhuma ocorrência aberta.</p>
            ) : (
              <ol className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                {queue.occurrences.map((o, index) => (
                  <li key={o._id}>
                    <Link
                      href={`/ocorrencias/${o._id}`}
                      className="flex items-start gap-3 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    >
                      <span className="w-6 shrink-0 text-right text-sm text-zinc-500">
                        {index + 1}.
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs text-zinc-500">
                          {CATEGORIES[o.category].label}
                        </span>
                        <span className="block text-sm">{o.summary}</span>
                        <span className="block truncate text-xs text-zinc-500">
                          {o.address} · aberta em {formatDate(o.openedAt)}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold">
                        {o.appeal}
                        <span className="block text-[10px] font-normal text-zinc-500">
                          apelo
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <Link
            href={`/?orgao=${slug}`}
            className="inline-block text-sm text-blue-600 underline"
          >
            Ver no mapa
          </Link>
        </>
      )}
    </div>
  );
}
