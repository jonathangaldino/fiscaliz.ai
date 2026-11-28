"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { AGENCIES, isAgencySlug } from "@/convex/lib/categories";
import { computePriority } from "@/convex/lib/priority";
import { formatAge, formatAppeal, formatDays } from "@/lib/format";
import { useNow } from "@/lib/useNow";
import { AgencyContact } from "./AgencyContact";
import { OccurrenceRow } from "./OccurrenceRow";
import { buttonClass } from "./ui/Button";
import { Chip } from "./ui/Chip";
import { Glyph } from "./ui/Glyph";
import { Card, Notice, Page } from "./ui/Page";
import { PriorityBadge } from "./ui/PriorityBadge";

const SORTS = {
  priority: "Prioridade",
  appeal: "Apelo",
  oldest: "Mais antigas",
} as const;
type Sort = keyof typeof SORTS;

export function AgencyQueue({ slug }: { slug: string }) {
  const queue = useQuery(api.occurrences.listByAgency, { slug });
  const now = useNow();
  const [sort, setSort] = useState<Sort>("priority");

  const rows = useMemo(() => {
    const list = (queue?.occurrences ?? []).map((occurrence) => ({
      occurrence,
      priority: computePriority(occurrence, now),
    }));
    const oldest = (a: (typeof list)[number], b: (typeof list)[number]) =>
      a.occurrence.openedAt - b.occurrence.openedAt;
    return list.sort((a, b) =>
      sort === "priority"
        ? b.priority.score - a.priority.score || oldest(a, b)
        : sort === "appeal"
          ? b.occurrence.appeal - a.occurrence.appeal || oldest(a, b)
          : oldest(a, b),
    );
  }, [queue, now, sort]);
  const overdueCount = rows.filter((row) => row.priority.overdue).length;

  if (!isAgencySlug(slug)) {
    return (
      <Page>
        <Notice>Órgão não encontrado.</Notice>
      </Page>
    );
  }
  const agency = AGENCIES[slug];

  return (
    <Page width="lg">
      <header className="space-y-1">
        <p className="text-sm font-medium text-muted">Fila do órgão</p>
        <h1 className="text-3xl font-semibold tracking-tight">{agency.name}</h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <Card>
          <AgencyContact agency={agency} />
        </Card>
        {queue && (
          <dl className="grid grid-cols-3 gap-3 sm:grid-cols-1">
            <Stat label="Ocorrências abertas" value={queue.openCount} />
            <Stat label="Apelo total" value={queue.totalAppeal} />
            <Stat label="Acima do prazo de referência" value={overdueCount} />
          </dl>
        )}
      </div>

      {queue === undefined ? (
        <Notice>Carregando…</Notice>
      ) : queue === null ? (
        <Notice>Órgão ainda não cadastrado. Rode o seed do Convex.</Notice>
      ) : (
        <Card className="px-2 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-2">
            <h2 className="text-base font-semibold">Fila do órgão</h2>
            <div className="flex items-center gap-1">
              <a
                href={`/api/ocorrencias.csv?orgao=${slug}`}
                download
                className={buttonClass({ variant: "ghost", size: "sm" })}
              >
                Baixar dados
              </a>
              <Link
                href={`/mapa?orgao=${slug}`}
                className={buttonClass({ variant: "ghost", size: "sm" })}
              >
                Ver no mapa
                <Glyph name="chevronRight" size={16} />
              </Link>
            </div>
          </div>
          <div
            role="group"
            aria-label="Ordenar a fila por"
            className="flex flex-wrap items-center gap-2 px-3 pb-3"
          >
            {(Object.keys(SORTS) as Sort[]).map((key) => (
              <Chip
                key={key}
                selected={sort === key}
                onClick={() => setSort(key)}
              >
                {SORTS[key]}
              </Chip>
            ))}
          </div>
          {sort === "priority" && (
            <p className="px-3 pb-3 text-xs text-subtle">
              A prioridade soma gravidade, tempo em aberto, movimento do local,
              apelo e tendência de piora. Abra uma ocorrência para ver os
              pontos de cada fator.
            </p>
          )}
          {rows.length === 0 ? (
            <Notice>Nenhuma ocorrência aberta.</Notice>
          ) : (
            <ol className="space-y-0.5">
              {rows.map(({ occurrence: o, priority }, index) => (
                <OccurrenceRow
                  key={o._id}
                  occurrence={o}
                  rank={index + 1}
                  meta={`${o.address} · ${formatAppeal(o.appeal)} · aberta ${formatAge(priority.ageDays)}`}
                  badges={
                    <>
                      <PriorityBadge level={priority.level} />
                      {priority.overdue && (
                        <span
                          className="rounded-full border border-line px-2 py-0.5 text-xs font-medium text-muted"
                          title={`Prazo de referência para esta categoria nesta via: ${formatDays(priority.targetDays)}`}
                        >
                          Acima do prazo de {formatDays(priority.targetDays)}
                        </span>
                      )}
                    </>
                  }
                  aside={
                    <span
                      className="shrink-0 text-right"
                      title={`Prioridade: ${priority.score} de 100`}
                    >
                      <span
                        aria-hidden
                        className="block text-lg leading-none font-semibold tabular-nums"
                      >
                        {priority.score}
                      </span>
                      <span aria-hidden className="text-[11px] text-subtle">
                        prioridade
                      </span>
                      <span className="sr-only">
                        Prioridade: {priority.score} de 100
                      </span>
                    </span>
                  }
                />
              ))}
            </ol>
          )}
        </Card>
      )}
    </Page>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass-strong rounded-card px-5 py-4 sm:min-w-44">
      <dt className="text-xs font-medium text-subtle">{label}</dt>
      <dd className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
        {value}
      </dd>
    </div>
  );
}
