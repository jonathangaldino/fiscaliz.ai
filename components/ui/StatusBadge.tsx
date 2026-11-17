export type OccurrenceStatus = "open" | "verifying" | "resolved";

export const STATUS_LABEL: Record<OccurrenceStatus, string> = {
  open: "Aberta",
  verifying: "Verificando",
  resolved: "Resolvida",
};

const styles: Record<OccurrenceStatus, string> = {
  open: "bg-(--status-open-tint) text-(--status-open)",
  verifying: "bg-(--status-verifying-tint) text-(--status-verifying)",
  resolved: "bg-(--status-resolved-tint) text-(--status-resolved)",
};

/** Status pill. Text carries the meaning; color only reinforces it. */
export function StatusBadge({
  status,
  className = "",
}: {
  status: OccurrenceStatus;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status]} ${className}`}
    >
      {status === "verifying" && (
        <span
          aria-hidden
          className="size-1.5 animate-pulse rounded-full bg-current"
        />
      )}
      {STATUS_LABEL[status]}
    </span>
  );
}
