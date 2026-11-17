"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatAppeal, formatDate } from "@/lib/format";
import { OccurrenceRow } from "./OccurrenceRow";
import { StatusBadge } from "./ui/StatusBadge";
import { Card, Notice, Page } from "./ui/Page";

/** History of occurrences that citizens confirmed as solved (V2). */
export function ResolvedList() {
  const resolved = useQuery(api.occurrences.listResolved);

  return (
    <Page width="lg">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          Ocorrências resolvidas
        </h1>
        <p className="text-muted">
          Problemas que quem relatou confirmou como resolvidos. Saem do mapa e
          ficam aqui como histórico.
        </p>
      </header>

      {resolved === undefined ? (
        <Notice>Carregando…</Notice>
      ) : resolved.length === 0 ? (
        <Notice>Nenhuma ocorrência resolvida ainda.</Notice>
      ) : (
        <Card className="px-2 py-2">
          <ul className="space-y-0.5">
            {resolved.map((o) => (
              <OccurrenceRow
                key={o._id}
                occurrence={o}
                meta={`${o.address} · ${formatAppeal(o.appeal)} · aberta em ${formatDate(o.openedAt)}`}
                aside={
                  <span className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                    <StatusBadge status="resolved" />
                    {o.resolvedAt && (
                      <span className="text-xs text-subtle">
                        {formatDate(o.resolvedAt)}
                      </span>
                    )}
                  </span>
                }
              />
            ))}
          </ul>
        </Card>
      )}
    </Page>
  );
}
