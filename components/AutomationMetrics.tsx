"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, Notice, Stat } from "./ui/Page";

const TARGET_LABELS: Record<string, string> = {
  police: "Polícia Militar (190)",
  samu: "SAMU (192)",
  firefighters: "Bombeiros (193)",
  civil_defense: "Defesa Civil (199)",
  sanepar: "Sanepar",
  copel: "Copel",
  unknown: "Canal não identificado",
};

const pct = (part: number, whole: number) =>
  whole === 0 ? "—" : `${Math.round((100 * part) / whole)}%`;

function duration(ms: number | null) {
  if (ms === null) return "—";
  const seconds = Math.round(ms / 1000);
  return seconds < 120 ? `${seconds} s` : `${Math.round(seconds / 60)} min`;
}

export function AutomationMetrics() {
  const m = useQuery(api.metrics.summary, {});

  return (
    <main
      id="conteudo"
      className="mx-auto w-full max-w-5xl space-y-6 px-4 pt-6 pb-12 sm:px-6"
    >
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          Automação em números
        </h1>
        <p className="text-muted">
          O que o bot fez sozinho: juntou relatos repetidos, mandou cada
          ocorrência ao órgão certo e desviou o que não é da Prefeitura. Nenhuma
          triagem manual.
        </p>
      </header>

      {m === undefined ? (
        <Notice>Carregando…</Notice>
      ) : (
        <>
          <Card className="space-y-3">
            <h2 className="text-base font-semibold">Relatos viram ocorrências</h2>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Relatos" value={String(m.reports)} />
              <Stat label="Ocorrências" value={String(m.occurrences)} />
              <Stat
                label="Duplicatas evitadas"
                value={String(Math.max(0, m.reports - m.occurrences))}
              />
              <Stat
                label="Roteadas ao órgão"
                value={pct(m.routed, m.occurrences)}
              />
            </dl>
          </Card>

          <Card className="space-y-3">
            <h2 className="text-base font-semibold">Tempo e verificação</h2>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat
                label="Até o mapa (mediana)"
                value={duration(m.timeToMap.p50)}
              />
              <Stat
                label="Até o mapa (95%)"
                value={duration(m.timeToMap.p95)}
              />
              <Stat label="Em verificação" value={String(m.verifying)} />
              <Stat label="Resolvidas" value={String(m.resolved)} />
            </dl>
          </Card>

          <Card className="space-y-3">
            <h2 className="text-base font-semibold">Desvios</h2>
            {m.diversions.length === 0 ? (
              <p className="text-sm text-muted">Nenhum desvio até agora.</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {m.diversions.map((d) => (
                  <li
                    key={`${d.kind}:${d.target}`}
                    className="flex justify-between gap-3 py-2"
                  >
                    <span>
                      <span className="text-subtle">
                        {d.kind === "emergency" ? "Emergência" : "Concessionária"}
                        {" · "}
                      </span>
                      {TARGET_LABELS[d.target] ?? d.target}
                    </span>
                    <span className="font-semibold tabular-nums">{d.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="space-y-3">
            <h2 className="text-base font-semibold">Por órgão</h2>
            <div className="overflow-x-auto rounded-card border border-line bg-surface/50">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-subtle">
                  <tr>
                    <th scope="col" className="p-2 font-medium">Órgão</th>
                    <th scope="col" className="p-2 font-medium">Abertas</th>
                    <th scope="col" className="p-2 font-medium">Resolvidas</th>
                    <th scope="col" className="p-2 font-medium">Apelo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line tabular-nums">
                  {m.agencies.map((a) => (
                    <tr key={a.slug}>
                      <td className="p-2">
                        <Link
                          href={`/orgaos/${a.slug}`}
                          className="underline-offset-2 hover:underline"
                        >
                          {a.name}
                        </Link>
                      </td>
                      <td className="p-2">{a.open}</td>
                      <td className="p-2">{a.resolved}</td>
                      <td className="p-2">{a.appeal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <p className="text-xs text-subtle">
        Conta só relatos reais, sem os dados de demonstração. Duplicatas
        evitadas são relatos que somaram apelo a uma ocorrência existente. O
        tempo até o mapa vai da primeira mensagem do cidadão ao registro.
        Desvios não guardam telefone, texto nem local.
      </p>
    </main>
  );
}
