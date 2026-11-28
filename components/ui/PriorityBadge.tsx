import {
  PRIORITY_LEVEL_LABEL,
  type PriorityLevel,
} from "@/convex/lib/priority";

const styles: Record<PriorityLevel, string> = {
  critical: "bg-danger/12 text-danger",
  high: "bg-(--status-verifying-tint) text-(--status-verifying)",
  medium: "bg-(--status-open-tint) text-(--status-open)",
  low: "border border-line bg-surface/60 text-muted",
};

/** Priority pill. The level name carries the meaning; color only reinforces it. */
export function PriorityBadge({
  level,
  score,
  className = "",
}: {
  level: PriorityLevel;
  /** Shown next to the level when given. */
  score?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${styles[level]} ${className}`}
    >
      <span className="sr-only">Prioridade </span>
      {PRIORITY_LEVEL_LABEL[level]}
      {score !== undefined && (
        <span className="font-medium tabular-nums opacity-80">{score}</span>
      )}
    </span>
  );
}
