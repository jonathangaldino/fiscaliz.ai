"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { CATEGORIES } from "@/convex/lib/categories";
import { formatAppeal, formatDate } from "@/lib/format";

/** History of occurrences that citizens confirmed as solved (V2). */
export function ResolvedList() {
  const resolved = useQuery(api.occurrences.listResolved);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Ocorrências resolvidas</h1>
        <p className="text-sm text-zinc-500">
          Problemas que quem relatou confirmou como resolvidos. Saem do mapa e
          ficam aqui como histórico.
        </p>
      </header>

      {resolved === undefined ? (
        <p className="text-sm text-zinc-500">Carregando…</p>
      ) : resolved.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhuma ocorrência resolvida ainda.</p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {resolved.map((o) => {
            const category = CATEGORIES[o.category];
            return (
              <li key={o._id}>
                <Link
                  href={`/ocorrencias/${o._id}`}
                  className="flex items-start gap-3 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <span
                    aria-hidden
                    className="mt-1 h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-zinc-500">
                      {category.label}
                    </span>
                    <span className="block text-sm">{o.summary}</span>
                    <span className="block truncate text-xs text-zinc-500">
                      {o.address} · aberta em {formatDate(o.openedAt)}
                      {o.resolvedAt ? ` · resolvida em ${formatDate(o.resolvedAt)}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-zinc-500">
                    {formatAppeal(o.appeal)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
