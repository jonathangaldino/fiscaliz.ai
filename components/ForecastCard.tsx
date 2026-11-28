"use client";

import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { PublicOccurrence } from "@/convex/occurrences";
import { describeWindow } from "@/convex/lib/forecast";
import { formatDate } from "@/lib/format";
import { playSound } from "@/lib/sound";
import { Button } from "./ui/Button";
import { Card } from "./ui/Page";

/**
 * Forecast of an occurrence. A committed forecast is public; before that only
 * the agency-side estimate shows, with the button to commit (demo only).
 */
export function ForecastCard({
  occurrence,
  now,
}: {
  occurrence: PublicOccurrence;
  now: number;
}) {
  const open = occurrence.status === "open" && !occurrence.forecast;
  const estimate = useQuery(
    api.forecast.estimate,
    open ? { id: occurrence._id } : "skip",
  );

  if (occurrence.forecast) {
    return (
      <CommittedForecast
        forecast={occurrence.forecast}
        resolved={occurrence.status === "resolved"}
        now={now}
      />
    );
  }
  if (!open || !estimate) return null;
  return <ForecastEstimate id={occurrence._id} estimate={estimate} />;
}

export function CommittedForecast({
  forecast,
  resolved,
  now,
}: {
  forecast: NonNullable<PublicOccurrence["forecast"]>;
  resolved: boolean;
  now: number;
}) {
  const passed = !resolved && now >= forecast.end;
  return (
    <Card className="space-y-1.5 text-sm">
      <h2 className="text-base font-semibold">Previsão de atendimento</h2>
      <p className="text-lg font-semibold first-letter:uppercase">
        {describeWindow(forecast)}
      </p>
      <p className="text-muted">
        Assumida pelo órgão responsável em {formatDate(forecast.committedAt)}.
        É uma previsão, não uma garantia.
        {passed && " A janela informada já passou."}
      </p>
    </Card>
  );
}

type Estimate = NonNullable<
  ReturnType<typeof useQuery<typeof api.forecast.estimate>>
>;

export function ForecastEstimate({
  id,
  estimate,
}: {
  id: string;
  estimate: Estimate;
}) {
  const commit = useMutation(api.forecast.commit);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const position = `${estimate.position}ª de ${estimate.queueSize} na fila do órgão`;

  return (
    <Card className="space-y-3 text-sm">
      <h2 className="text-base font-semibold">Previsão de atendimento</h2>
      <p className="text-fg">
        Estimativa pela fila do órgão:{" "}
        <strong className="font-semibold">
          {describeWindow(estimate.window)}
        </strong>{" "}
        ({position}). Ainda não foi informada a quem relatou.
      </p>
      <p className="text-muted">
        Demonstração: ao assumir, a previsão fica pública nesta página e o
        bot avisa quem relatou.
      </p>
      <Button
        disabled={pending}
        aria-busy={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          try {
            await commit({ id });
            playSound("success");
          } catch (e) {
            setError(
              e instanceof ConvexError
                ? String(e.data)
                : "Não foi possível assumir a previsão.",
            );
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "Assumindo…" : "Assumir previsão"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </Card>
  );
}
