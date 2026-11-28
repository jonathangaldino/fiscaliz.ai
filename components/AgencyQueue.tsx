"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { PublicOccurrence } from "@/convex/occurrences";
import {
  AGENCIES,
  isAgencySlug,
  type AgencyInfo,
} from "@/convex/lib/categories";
import {
  AGENCY_PLANS,
  describeWindow,
  planQueue,
  type QueuePlan,
  type QueueRow,
} from "@/convex/lib/forecast";
import { computePriority, type Priority } from "@/convex/lib/priority";
import {
  formatAge,
  formatAppeal,
  formatBRL,
  formatDays,
} from "@/lib/format";
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

type Queue = {
  occurrences: PublicOccurrence[];
  openCount: number;
  totalAppeal: number;
};

export function AgencyQueue({ slug }: { slug: string }) {
  const queue = useQuery(api.occurrences.listByAgency, { slug });
  const now = useNow();

  if (!isAgencySlug(slug)) {
    return (
      <Page>
        <Notice>Órgão não encontrado.</Notice>
      </Page>
    );
  }
  return <AgencyQueueView agency={AGENCIES[slug]} queue={queue} now={now} />;
}

/** The queue page without the data fetching. */
export function AgencyQueueView({
  agency,
  queue,
  now,
}: {
  agency: AgencyInfo;
  /** undefined while loading, null when the agency is not in the database. */
  queue: Queue | null | undefined;
  now: number;
}) {
  const [sort, setSort] = useState<Sort>("priority");

  const plan = useMemo(
    () => planQueue(queue?.occurrences ?? [], AGENCY_PLANS[agency.slug], now),
    [queue, agency.slug, now],
  );
  const rows = useMemo(() => {
    // planQueue returns the rows by priority, oldest first on a tie.
    const list = plan.rows.map((row) => ({
      ...row,
      priority: computePriority(row.item, now),
    }));
    if (sort === "priority") return list;
    const oldest = (a: (typeof list)[number], b: (typeof list)[number]) =>
      a.item.openedAt - b.item.openedAt;
    return list.sort((a, b) =>
      sort === "appeal" ? b.item.appeal - a.item.appeal || oldest(a, b) : oldest(a, b),
    );
  }, [plan, now, sort]);
  const overdueCount = rows.filter((row) => row.priority.overdue).length;

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

      {queue && rows.length > 0 && <PlanSummary plan={plan} rows={rows} />}

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
                href={`/api/ocorrencias.csv?orgao=${agency.slug}`}
                download
                className={buttonClass({ variant: "ghost", size: "sm" })}
              >
                Baixar dados
              </a>
              <Link
                href={`/mapa?orgao=${agency.slug}`}
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
              {rows.map((row, index) => (
                <QueueItem
                  key={row.item._id}
                  row={row}
                  rank={index + 1}
                  fiscalYear={plan.fiscalYear}
                />
              ))}
            </ol>
          )}
        </Card>
      )}
    </Page>
  );
}

type Row = QueueRow<PublicOccurrence> & { priority: Priority };

const pill =
  "rounded-full border border-line px-2 py-0.5 text-xs font-medium text-muted";

function QueueItem({
  row,
  rank,
  fiscalYear,
}: {
  row: Row;
  rank: number;
  fiscalYear: number;
}) {
  const { item: o, priority } = row;
  return (
    <OccurrenceRow
      occurrence={o}
      rank={rank}
      meta={`${o.address} · ${formatAppeal(o.appeal)} · aberta ${formatAge(priority.ageDays)}`}
      badges={
        <>
          <PriorityBadge level={priority.level} />
          {priority.overdue && (
            <span
              className={pill}
              title={`Prazo de referência para esta categoria nesta via: ${formatDays(priority.targetDays)}`}
            >
              Acima do prazo de {formatDays(priority.targetDays)}
            </span>
          )}
          {o.forecast ? (
            <span className="rounded-full bg-(--status-resolved-tint) px-2 py-0.5 text-xs font-semibold text-(--status-resolved)">
              Previsão assumida: {describeWindow(o.forecast)}
            </span>
          ) : row.window ? (
            <span
              className={pill}
              title="Estimativa pela posição na fila, pelo orçamento e pela capacidade. Ainda não informada ao cidadão."
            >
              Estimativa: {describeWindow(row.window)}
            </span>
          ) : (
            <span
              className={pill}
              title={
                row.status === "over_budget"
                  ? `O custo estimado não cabe no saldo de ${fiscalYear}.`
                  : `A equipe só chegaria nesta ocorrência depois do fim de ${fiscalYear}.`
              }
            >
              {row.status === "over_budget"
                ? `Fora do orçamento de ${fiscalYear}`
                : `Fora da capacidade de ${fiscalYear}`}
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
          <span className="sr-only">Prioridade: {priority.score} de 100</span>
        </span>
      }
    />
  );
}

/** What this year's budget covers, and what is left for the next one. */
function PlanSummary({
  plan,
  rows,
}: {
  plan: QueuePlan<PublicOccurrence>;
  rows: Row[];
}) {
  const urgentDeferred = rows.filter(
    (row) =>
      row.status !== "funded" &&
      (row.priority.level === "critical" || row.priority.level === "high"),
  ).length;
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">
          Plano de {plan.fiscalYear}
        </h2>
        <span className={pill}>Valores ilustrativos</span>
      </div>
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <PlanFact label={`Saldo de ${plan.fiscalYear}`}>
          {formatBRL(plan.remaining)}
        </PlanFact>
        <PlanFact label="Cabem no orçamento">
          {plan.fundedCount} de {rows.length} · {formatBRL(plan.fundedCost)}
        </PlanFact>
        <PlanFact label={`Ficam para ${plan.fiscalYear + 1}`}>
          {plan.deferredCount === 0
            ? "Nenhuma"
            : `${plan.deferredCount} · ${formatBRL(plan.deferredCost)}`}
        </PlanFact>
      </dl>
      {urgentDeferred > 0 && (
        <p className="text-sm text-fg">
          {urgentDeferred === 1
            ? "1 ocorrência de prioridade alta ou crítica não cabe"
            : `${urgentDeferred} ocorrências de prioridade alta ou crítica não cabem`}{" "}
          no plano de {plan.fiscalYear}. É o caso para crédito suplementar ou
          para o orçamento de {plan.fiscalYear + 1}.
        </p>
      )}
      <p className="text-xs text-subtle">
        A fila é percorrida por prioridade: cada ocorrência soma seu custo
        típico até o saldo acabar, e a data vem da capacidade mensal da equipe.
        A estimativa é do órgão; quem relatou só é avisado quando a previsão é
        assumida, na página da ocorrência.
      </p>
    </Card>
  );
}

function PlanFact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-control border border-line bg-surface/60 px-3 py-2.5">
      <dt className="text-xs text-subtle">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold tabular-nums">{children}</dd>
    </div>
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
