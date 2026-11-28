import { CATEGORIES, type CategoryKey } from "@/convex/lib/categories";
import {
  CATEGORY_PRIORITY,
  PRIORITY_FACTOR_LABEL,
  PRIORITY_WEIGHTS,
  ROAD_CLASS_LABEL,
  type Priority,
  type PriorityFactorKey,
} from "@/convex/lib/priority";
import { formatAge, formatAppeal, formatDays } from "@/lib/format";
import { PriorityBadge } from "./ui/PriorityBadge";
import { Card } from "./ui/Page";

/** Why an occurrence sits where it does in the queue: points per factor. */
export function PriorityBreakdown({
  priority,
  category,
  appeal,
}: {
  priority: Priority;
  category: CategoryKey;
  appeal: number;
}) {
  const profile = CATEGORY_PRIORITY[category];
  const detail: Record<PriorityFactorKey, string> = {
    gravity: `${CATEGORIES[category].label}: nota ${profile.gravity} de 5`,
    urgency: `Aberta ${formatAge(priority.ageDays)}; prazo de referência de ${formatDays(priority.targetDays)}`,
    exposure: ROAD_CLASS_LABEL[priority.roadClass],
    appeal: formatAppeal(appeal),
    tendency: `Nota ${profile.tendency} de 5`,
  };

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Prioridade</h2>
        <PriorityBadge level={priority.level} score={priority.score} />
      </div>
      <p className="text-sm text-muted">
        {priority.score} de 100 pontos. A ordem de atendimento sugerida ao órgão
        considera a gravidade do problema, o tempo em aberto e o movimento do
        local, além de quantas pessoas relataram.
      </p>
      <ul className="space-y-3">
        {priority.factors.map((factor) => (
          <li key={factor.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">
                {PRIORITY_FACTOR_LABEL[factor.key]}
              </span>
              <span className="shrink-0 text-xs text-subtle tabular-nums">
                {Math.round(factor.points)} de {PRIORITY_WEIGHTS[factor.key]}
              </span>
            </div>
            <div
              aria-hidden
              className="mt-1 h-1.5 overflow-hidden rounded-full bg-(--line)"
            >
              <div
                className="h-full rounded-full bg-accent-solid"
                style={{ width: `${Math.round(factor.value * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-subtle">{detail[factor.key]}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
