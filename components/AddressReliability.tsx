"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, Notice, Stat } from "./ui/Page";

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
    <main
      id="conteudo"
      className="mx-auto w-full max-w-5xl space-y-6 px-4 pt-6 pb-12 sm:px-6"
    >
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          Confiabilidade do endereço
        </h1>
        <p className="text-muted">
          Como o bot acha a rua que o cidadão escreveu ou falou, e quantas vezes
          ele confirma ou corrige o endereço.
        </p>
      </header>

      {rows === undefined ? (
        <Notice>Carregando…</Notice>
      ) : (
        (["text", "audio"] as const).map((medium) => {
          const mine = rows.filter((r) => r.medium === medium);
          const total = mine.reduce((sum, r) => sum + r.count, 0);
          const notFound = mine.find((r) => r.group === "none")?.count ?? 0;
          const ambiguous = mine.reduce((sum, r) => sum + r.ambiguous, 0);
          return (
            <Card key={medium} className="space-y-3">
              <h2 className="text-base font-semibold">
                {MEDIUM_LABELS[medium]}
              </h2>
              <dl className="grid grid-cols-3 gap-3">
                <Stat label="Endereços" value={String(total)} />
                <Stat label="Não encontrado" value={pct(notFound, total)} />
                <Stat label="Ambiguidade" value={pct(ambiguous, total)} />
              </dl>
              <div className="overflow-x-auto rounded-card border border-line bg-surface/50">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-subtle">
                    <tr>
                      <th scope="col" className="p-2 font-medium">
                        Origem
                      </th>
                      <th scope="col" className="p-2 font-medium">
                        Endereços
                      </th>
                      <th scope="col" className="p-2 font-medium">
                        Confirmados
                      </th>
                      <th scope="col" className="p-2 font-medium">
                        Corrigidos (pin / texto)
                      </th>
                      <th scope="col" className="p-2 font-medium">
                        Erro p50 / p95
                      </th>
                      <th scope="col" className="p-2 font-medium">
                        Latência p50 / p95
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {mine.map((r) => (
                      <tr key={r.group}>
                        <td className="p-2">{GROUP_LABELS[r.group]}</td>
                        <td className="p-2">
                          {r.count}{" "}
                          <span className="text-subtle">
                            ({pct(r.count, total)})
                          </span>
                        </td>
                        {r.group === "none" ? (
                          <td className="p-2 text-subtle" colSpan={3}>
                            o bot pediu o pin
                          </td>
                        ) : (
                          <>
                            <td className="p-2">
                              {pct(r.confirmed, r.closed)}
                            </td>
                            <td className="p-2">
                              {pct(r.correctedPin + r.correctedText, r.closed)}{" "}
                              <span className="text-subtle">
                                ({r.correctedPin} / {r.correctedText})
                              </span>
                            </td>
                            <td className="p-2">
                              {pair(r.errorP50, r.errorP95, "m")}
                            </td>
                          </>
                        )}
                        <td className="p-2">{pair(r.msP50, r.msP95, "ms")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })
      )}

      <p className="text-xs text-subtle">
        Confirmados e corrigidos contam só endereços com desfecho: o cidadão
        respondeu SIM, mandou pin, mandou outro endereço ou abandonou a
        conversa. O erro é a distância até o pin, quando ele corrige com pin.
      </p>
    </main>
  );
}
