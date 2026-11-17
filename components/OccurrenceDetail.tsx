"use client";

import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { AGENCIES, CATEGORIES, type AgencySlug } from "@/convex/lib/categories";
import { formatAppeal, formatDateTime } from "@/lib/format";
import { AgencyContact } from "./AgencyContact";
import { Button } from "./ui/Button";
import { CategoryIcon } from "./ui/CategoryIcon";
import { StatusBadge } from "./ui/StatusBadge";

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
        <span className="glass inline-flex items-center gap-2 rounded-full py-1 pr-3 pl-1.5 text-xs font-semibold">
          <CategoryIcon category={occurrence.category} size={22} />
          {category.label}
        </span>
        <h1 className="text-2xl font-semibold">{occurrence.summary}</h1>
        <p className="text-sm text-zinc-500">{occurrence.address}</p>
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-zinc-500">Situação</dt>
          <dd className="mt-0.5">
            <StatusBadge status={occurrence.status} />
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Apelo</dt>
          <dd className="font-medium">{formatAppeal(occurrence.appeal)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Aberta em</dt>
          <dd className="font-medium">{formatDateTime(occurrence.openedAt)}</dd>
        </div>
        {occurrence.verificationStartedAt && (
          <div>
            <dt className="text-zinc-500">Verificação iniciada em</dt>
            <dd className="font-medium">
              {formatDateTime(occurrence.verificationStartedAt)}
            </dd>
          </div>
        )}
        {occurrence.resolvedAt && (
          <div>
            <dt className="text-zinc-500">Resolvida em</dt>
            <dd className="font-medium">{formatDateTime(occurrence.resolvedAt)}</dd>
          </div>
        )}
      </dl>

      <Verification id={occurrence._id} status={occurrence.status} />

      <section className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
        <h2 className="mb-2 font-semibold">Órgão responsável</h2>
        {agency ? (
          <>
            <AgencyContact agency={agency} />
            <Link
              href={`/orgaos/${agency.slug}`}
              className="mt-3 inline-block text-sm text-blue-600 underline"
            >
              Ver fila do órgão
            </Link>
          </>
        ) : (
          <p className="text-zinc-500">
            Sem órgão definido para esta categoria.
          </p>
        )}
      </section>

      <Link
        href={`/?categoria=${occurrence.category}`}
        className="inline-block text-sm text-blue-600 underline"
      >
        Ver no mapa
      </Link>
    </article>
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
      <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
        Verificando: perguntamos a quem relatou se o problema foi resolvido. A
        ocorrência é resolvida quando 30% do apelo responde SIM; se o NÃO
        passar o SIM, ou em 48 h sem resposta suficiente, ela volta a ficar aberta.
      </p>
    );
  }
  if (status !== "open" || !availability) return null;

  return (
    <section className="space-y-2 rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
      <h2 className="font-semibold">O problema foi resolvido?</h2>
      {availability.canStart ? (
        <>
          <p className="text-zinc-500">
            Demonstração: o bot pergunta pelo WhatsApp a quem relatou se o
            problema já foi resolvido.
          </p>
          <Button
            variant="warning"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              setError(null);
              try {
                await start({ id });
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
            Iniciar verificação
          </Button>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </>
      ) : (
        <p className="text-zinc-500">
          Esta ocorrência foi verificada há pouco e continua aberta. Nova
          verificação a partir de {formatDateTime(availability.availableAt)}.
        </p>
      )}
    </section>
  );
}
