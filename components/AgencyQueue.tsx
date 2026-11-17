"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { AGENCIES, isAgencySlug } from "@/convex/lib/categories";
import { formatAppeal, formatDate } from "@/lib/format";
import { AgencyContact } from "./AgencyContact";
import { OccurrenceRow } from "./OccurrenceRow";
import { buttonClass } from "./ui/Button";
import { Glyph } from "./ui/Glyph";
import { Card, Notice, Page } from "./ui/Page";

export function AgencyQueue({ slug }: { slug: string }) {
  const queue = useQuery(api.occurrences.listByAgency, { slug });

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
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-1">
            <Stat label="Ocorrências abertas" value={queue.openCount} />
            <Stat label="Apelo total" value={queue.totalAppeal} />
          </dl>
        )}
      </div>

      {queue === undefined ? (
        <Notice>Carregando…</Notice>
      ) : queue === null ? (
        <Notice>Órgão ainda não cadastrado. Rode o seed do Convex.</Notice>
      ) : (
        <Card className="px-2 py-3">
          <div className="flex items-center justify-between px-3 pb-2">
            <h2 className="text-base font-semibold">Fila por apelo</h2>
            <Link
              href={`/?orgao=${slug}`}
              className={buttonClass({ variant: "ghost", size: "sm" })}
            >
              Ver no mapa
              <Glyph name="chevronRight" size={16} />
            </Link>
          </div>
          {queue.occurrences.length === 0 ? (
            <Notice>Nenhuma ocorrência aberta.</Notice>
          ) : (
            <ol className="space-y-0.5">
              {queue.occurrences.map((o, index) => (
                <OccurrenceRow
                  key={o._id}
                  occurrence={o}
                  rank={index + 1}
                  meta={`${o.address} · aberta em ${formatDate(o.openedAt)}`}
                  aside={
                    <span
                      className="shrink-0 text-right"
                      title={`Apelo: ${formatAppeal(o.appeal)}`}
                    >
                      <span
                        aria-hidden
                        className="block text-lg leading-none font-semibold tabular-nums"
                      >
                        {o.appeal}
                      </span>
                      <span aria-hidden className="text-[11px] text-subtle">
                        apelo
                      </span>
                      <span className="sr-only">
                        Apelo: {formatAppeal(o.appeal)}
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
