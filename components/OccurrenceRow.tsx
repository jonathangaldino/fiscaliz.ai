import Link from "next/link";
import type { PublicOccurrence } from "@/convex/occurrences";
import { CATEGORIES } from "@/convex/lib/categories";
import { CategoryIcon } from "./ui/CategoryIcon";
import { Glyph } from "./ui/Glyph";
import { StatusBadge } from "./ui/StatusBadge";

/** A linked occurrence row for the agency queue and the resolved list. */
export function OccurrenceRow({
  occurrence: o,
  meta,
  rank,
  aside,
}: {
  occurrence: PublicOccurrence;
  /** Small line under the summary. */
  meta: string;
  /** Position in a ranked list. */
  rank?: number;
  /** Right column (appeal, date). */
  aside?: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={`/ocorrencias/${o._id}`}
        className="group flex items-center gap-3 rounded-card p-2.5 transition-[background-color] duration-(--dur) hover:bg-(--glass-bg-strong)"
      >
        {rank !== undefined && (
          <span className="w-6 shrink-0 text-right text-sm font-semibold text-subtle tabular-nums">
            {rank}
          </span>
        )}
        <span className="flex size-12 shrink-0 items-center justify-center rounded-control border border-line bg-surface/70">
          <CategoryIcon category={o.category} size={34} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-xs font-medium text-muted">
            <span className="truncate">{CATEGORIES[o.category].label}</span>
            {o.status === "verifying" && <StatusBadge status="verifying" />}
          </span>
          <span className="mt-0.5 block text-[15px] leading-snug font-medium">
            {o.summary}
          </span>
          <span className="mt-0.5 block truncate text-xs text-subtle">
            {meta}
          </span>
        </span>
        {aside}
        <Glyph
          name="chevronRight"
          size={18}
          className="text-subtle transition-transform duration-(--dur) group-hover:translate-x-0.5"
        />
      </Link>
    </li>
  );
}
