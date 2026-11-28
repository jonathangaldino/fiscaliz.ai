"use client";

import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { AGENCIES, CATEGORIES, type AgencySlug } from "@/convex/lib/categories";
import { formatAppeal, formatDateTime } from "@/lib/format";
import { computePriority } from "@/convex/lib/priority";
import { playSound } from "@/lib/sound";
import { useNow } from "@/lib/useNow";
import { AgencyContact } from "./AgencyContact";
import { ForecastCard } from "./ForecastCard";
import { PriorityBreakdown } from "./PriorityBreakdown";
import { Button, buttonClass } from "./ui/Button";
import { CategoryIcon } from "./ui/CategoryIcon";
import { Glyph } from "./ui/Glyph";
import { Card, Notice, Page } from "./ui/Page";
import { StatusBadge } from "./ui/StatusBadge";

export function OccurrenceDetail({ id }: { id: string }) {
  const occurrence = useQuery(api.occurrences.get, { id });
  const now = useNow();

  if (occurrence === undefined) {
    return (
      <Page>
        <Notice>Carregando…</Notice>
      </Page>
    );
  }
  if (occurrence === null) {
    return (
      <Page>
        <Notice>Ocorrência não encontrada.</Notice>
      </Page>
    );
  }

  const category = CATEGORIES[occurrence.category];
  const agency = occurrence.agencySlug
    ? AGENCIES[occurrence.agencySlug as AgencySlug]
    : null;

  return (
    <Page>
      <Link
        href={`/mapa?categoria=${occurrence.category}`}
        className="-ml-2 inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-sm font-medium text-accent hover:bg-accent-tint"
      >
        <Glyph name="chevronLeft" size={16} />
        Ver no mapa
      </Link>

      <Card as="article" className="space-y-5">
        <header className="flex items-start gap-4">
          <span className="flex size-20 shrink-0 items-center justify-center rounded-card border border-line bg-surface/80 shadow-sm">
            <CategoryIcon category={occurrence.category} size={60} />
          </span>
          <div className="min-w-0 space-y-1.5 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-muted">
                {category.label}
              </span>
              <StatusBadge status={occurrence.status} />
            </div>
            <h1 className="text-2xl leading-tight font-semibold tracking-tight">
              {occurrence.summary}
            </h1>
            <p className="text-sm text-muted">{occurrence.address}</p>
          </div>
        </header>

        {occurrence.photo?.status === "ready" && (
          // eslint-disable-next-line @next/next/no-img-element -- Convex storage URL, already a re-encoded JPEG
          <img
            src={occurrence.photo.url}
            alt={`Foto enviada por quem relatou: ${occurrence.summary}`}
            className="max-h-[28rem] w-full rounded-card border border-line object-cover"
          />
        )}
        {occurrence.photo?.status === "processing" && (
          <p
            role="status"
            className="flex items-center gap-2 rounded-control border border-dashed border-line bg-surface/60 px-3 py-6 text-sm text-muted"
          >
            📷 Foto em processamento: rostos e placas estão sendo borrados antes
            de publicar.
          </p>
        )}

        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Fact label="Apelo">{formatAppeal(occurrence.appeal)}</Fact>
          <Fact label="Aberta em">{formatDateTime(occurrence.openedAt)}</Fact>
          {occurrence.verificationStartedAt && (
            <Fact label="Verificação iniciada em">
              {formatDateTime(occurrence.verificationStartedAt)}
            </Fact>
          )}
          {occurrence.resolvedAt && (
            <Fact label="Resolvida em">
              {formatDateTime(occurrence.resolvedAt)}
            </Fact>
          )}
        </dl>
      </Card>

      {occurrence.status !== "resolved" && (
        <PriorityBreakdown
          priority={computePriority(occurrence, now)}
          category={occurrence.category}
          appeal={occurrence.appeal}
        />
      )}

      <ForecastCard occurrence={occurrence} now={now} />

      <Verification id={occurrence._id} status={occurrence.status} />

      <Card className="space-y-3">
        <h2 className="text-base font-semibold">Órgão responsável</h2>
        {agency ? (
          <>
            <p className="text-lg font-semibold">{agency.name}</p>
            <AgencyContact agency={agency} />
            <Link
              href={`/orgaos/${agency.slug}`}
              className={buttonClass({ variant: "glass", size: "sm" })}
            >
              Ver fila do órgão
              <Glyph name="chevronRight" size={16} />
            </Link>
          </>
        ) : (
          <p className="text-sm text-muted">
            Sem órgão definido para esta categoria.
          </p>
        )}
      </Card>
    </Page>
  );
}

function Fact({ label, children }: { label: string; children: string }) {
  return (
    <div className="rounded-control border border-line bg-surface/60 px-3 py-2.5">
      <dt className="text-xs text-subtle">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold">{children}</dd>
    </div>
  );
}

/** V2: starts a verification (demo only) or shows how it is going. */
function Verification({
  id,
  status,
}: {
  id: string;
  status: "open" | "verifying" | "resolved";
}) {
  const availability = useQuery(api.verification.availability, { id });
  const start = useMutation(api.verification.start);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "verifying") {
    return (
      <Card className="border-(--status-verifying)/30 bg-(--status-verifying-tint)! text-sm">
        <h2 className="mb-1 font-semibold text-(--status-verifying)">
          Verificando
        </h2>
        <p className="text-fg">
          Perguntamos a quem relatou se o problema foi resolvido. A ocorrência é
          resolvida quando 30% do apelo responde SIM; se o NÃO passar o SIM, ou
          em 48 h sem resposta suficiente, ela volta a ficar aberta.
        </p>
      </Card>
    );
  }
  if (status !== "open" || !availability) return null;

  return (
    <Card className="space-y-3 text-sm">
      <h2 className="text-base font-semibold">O problema foi resolvido?</h2>
      {availability.canStart ? (
        <>
          <p className="text-muted">
            Demonstração: o bot pergunta pelo Telegram a quem relatou se o
            problema já foi resolvido.
          </p>
          <Button
            variant="warning"
            disabled={pending}
            aria-busy={pending}
            onClick={async () => {
              setPending(true);
              setError(null);
              try {
                await start({ id });
                playSound("success");
              } catch (e) {
                setError(
                  e instanceof ConvexError
                    ? String(e.data)
                    : "Não foi possível iniciar a verificação.",
                );
              } finally {
                setPending(false);
              }
            }}
          >
            {pending ? "Iniciando…" : "Iniciar verificação"}
          </Button>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </>
      ) : (
        <p className="text-muted">
          Esta ocorrência foi verificada há pouco e continua aberta. Nova
          verificação a partir de {formatDateTime(availability.availableAt)}.
        </p>
      )}
    </Card>
  );
}
