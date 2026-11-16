"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const GROUP_LABELS = {
  cnefe_exact: "IBGE, nome exato",
  cnefe_typo_1: "IBGE, 1 letra trocada",
  cnefe_typo_2: "IBGE, 2 letras trocadas",
  google: "Google",
  none: "Não encontrado",
} as const;

const MEDIUM_LABELS = { text: "Texto", audio: "Áudio" } as const;

const pct = (part: number, whole: number) =>
  whole === 0 ? "—" : `${Math.round((100 * part) / whole)}%`;
const pair = (a: number | null, b: number | null, unit: string) =>
  a === null ? "—" : `${a} / ${b} ${unit}`;

export function AddressReliability() {
  const rows = useQuery(api.addressMetrics.summary, {});

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Confiabilidade do endereço</h1>
        <p className="text-sm text-zinc-500">
          Como o bot acha a rua que o cidadão escreveu ou falou, e quantas vezes ele
          confirma ou corrige o endereço.
        </p>
      </header>

      {rows === undefined ? (
        <p className="text-sm text-zinc-500">Carregando…</p>
      ) : (
        (["text", "audio"] as const).map((medium) => {
          const mine = rows.filter((r) => r.medium === medium);
          const total = mine.reduce((sum, r) => sum + r.count, 0);
          const notFound = mine.find((r) => r.group === "none")?.count ?? 0;
          const ambiguous = mine.reduce((sum, r) => sum + r.ambiguous, 0);
          return (
            <section key={medium} className="space-y-3">
              <h2 className="text-sm font-semibold">{MEDIUM_LABELS[medium]}</h2>
              <dl className="grid grid-cols-3 gap-3">
                <Stat label="Endereços" value={String(total)} />
                <Stat label="Não encontrado" value={pct(notFound, total)} />
                <Stat label="Ambiguidade" value={pct(ambiguous, total)} />
              </dl>
              <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-zinc-500">
                    <tr>
                      <th className="p-2 font-normal">Origem</th>
                      <th className="p-2 font-normal">Endereços</th>
                      <th className="p-2 font-normal">Confirmados</th>
                      <th className="p-2 font-normal">Corrigidos (pin / texto)</th>
                      <th className="p-2 font-normal">Erro p50 / p95</th>
                      <th className="p-2 font-normal">Latência p50 / p95</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {mine.map((r) => (
                      <tr key={r.group}>
                        <td className="p-2">{GROUP_LABELS[r.group]}</td>
                        <td className="p-2">
                          {r.count} <span className="text-zinc-500">({pct(r.count, total)})</span>
                        </td>
                        {r.group === "none" ? (
                          <td className="p-2 text-zinc-500" colSpan={3}>
                            o bot pediu o pin
                          </td>
                        ) : (
                          <>
                            <td className="p-2">{pct(r.confirmed, r.closed)}</td>
                            <td className="p-2">
                              {pct(r.correctedPin + r.correctedText, r.closed)}{" "}
                              <span className="text-zinc-500">
                                ({r.correctedPin} / {r.correctedText})
                              </span>
                            </td>
                            <td className="p-2">{pair(r.errorP50, r.errorP95, "m")}</td>
                          </>
                        )}
                        <td className="p-2">{pair(r.msP50, r.msP95, "ms")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })
      )}

      <p className="text-xs text-zinc-500">
        Confirmados e corrigidos contam só endereços com desfecho: o cidadão respondeu
        SIM, mandou pin, mandou outro endereço ou abandonou a conversa. O erro é a
        distância até o pin, quando ele corrige com pin.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="text-2xl font-semibold">{value}</dd>
    </div>
  );
}
