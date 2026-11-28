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
  badges,
  aside,
}: {
  occurrence: PublicOccurrence;
  /** Small line under the summary. */
  meta: string;
  /** Position in a ranked list. */
  rank?: number;
  /** Pills next to the category name. */
  badges?: React.ReactNode;
  /** Right column (appeal, date). */
  aside?: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={`/ocorrencias/${o._id}`}
        className="group lit flex items-center gap-3 rounded-card p-2.5 transition-[background-color,transform] duration-(--dur) hover:bg-(--glass-bg-strong) active:scale-[0.99]"
      >
        {rank !== undefined && (
          <span className="w-6 shrink-0 text-right text-sm font-semibold text-subtle tabular-nums">
            {rank}
          </span>
        )}
        <span
          className={`size-12 shrink-0 items-center justify-center rounded-control border border-line bg-surface/70 ${
            // A row with pills needs the width on a phone.
            badges ? "hidden min-[420px]:flex" : "flex"
          }`}
        >
          <CategoryIcon
            category={o.category}
            size={34}
            className="transition-transform duration-(--dur-slow) ease-spring group-hover:scale-110"
          />
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
          {badges && (
            <span className="mt-1.5 flex flex-wrap items-center gap-1.5 whitespace-nowrap">
              {badges}
            </span>
          )}
        </span>
        {aside}
        <Glyph
          name="chevronRight"
          size={18}
          className={`text-subtle transition-transform duration-(--dur) group-hover:translate-x-0.5 ${
            badges ? "hidden sm:block" : ""
          }`}
        />
      </Link>
    </li>
  );
}
