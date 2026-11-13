"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { AGENCIES, CATEGORIES, type AgencySlug } from "@/convex/lib/categories";
import { formatAppeal, formatDateTime } from "@/lib/format";

const STATUS_LABEL = {
  open: "Aberta",
  verifying: "Verificando",
  resolved: "Resolvida",
} as const;

export function OccurrenceDetail({ id }: { id: string }) {
  const occurrence = useQuery(api.occurrences.get, { id });

  if (occurrence === undefined) {
    return <p className="p-6 text-sm text-zinc-500">Carregando…</p>;
  }
  if (occurrence === null) {
    return <p className="p-6 text-sm">Ocorrência não encontrada.</p>;
  }

  const category = CATEGORIES[occurrence.category];
  const agency = occurrence.agencySlug
    ? AGENCIES[occurrence.agencySlug as AgencySlug]
    : null;

  return (
    <article className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <div className="space-y-2">
        <span
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-white"
          style={{ backgroundColor: category.color }}
        >
          {category.label}
        </span>
        <h1 className="text-2xl font-semibold">{occurrence.summary}</h1>
        <p className="text-sm text-zinc-500">{occurrence.address}</p>
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-zinc-500">Situação</dt>
          <dd className="font-medium">{STATUS_LABEL[occurrence.status]}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Apelo</dt>
          <dd className="font-medium">{formatAppeal(occurrence.appeal)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Aberta em</dt>
          <dd className="font-medium">{formatDateTime(occurrence.openedAt)}</dd>
        </div>
      </dl>

      <section className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
        <h2 className="mb-2 font-semibold">Órgão responsável</h2>
        {agency ? (
          <p>{agency.name}</p>
        ) : (
          <p className="text-zinc-500">
            Sem órgão definido para esta categoria.
          </p>
        )}
      </section>

      <Link href="/" className="inline-block text-sm text-blue-600 underline">
        Ver no mapa
      </Link>
    </article>
  );
}
