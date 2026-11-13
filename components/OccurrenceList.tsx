import Link from "next/link";
import type { PublicOccurrence } from "@/convex/occurrences";
import { AGENCIES, CATEGORIES, type AgencySlug } from "@/convex/lib/categories";
import { formatAppeal, formatDate } from "@/lib/format";

type Props = {
  occurrences: PublicOccurrence[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
};

export function OccurrenceList({ occurrences, selectedId, onSelect }: Props) {
  if (occurrences.length === 0) {
    return (
      <p className="p-4 text-sm text-zinc-500">Nenhuma ocorrência aberta.</p>
    );
  }
  return (
    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
      {occurrences.map((o) => {
        const category = CATEGORIES[o.category];
        const agency = o.agencySlug
          ? AGENCIES[o.agencySlug as AgencySlug]
          : null;
        const selected = o._id === selectedId;
        return (
          <li key={o._id}>
            <button
              type="button"
              onClick={() => onSelect?.(o._id)}
              className={`flex w-full gap-3 p-3 text-left hover:bg-zinc-100 dark:hover:bg-zinc-900 ${
                selected ? "bg-zinc-100 dark:bg-zinc-900" : ""
              }`}
            >
              <span
                aria-hidden
                className="mt-1 h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-zinc-500">
                  {category.label}
                </span>
                <span className="block text-sm">{o.summary}</span>
                <span className="block truncate text-xs text-zinc-500">
                  {o.address} · {formatDate(o.openedAt)}
                  {agency ? ` · ${agency.name}` : ""}
                </span>
              </span>
              <span
                className="shrink-0 text-right text-sm font-semibold"
                title={`Apelo: ${formatAppeal(o.appeal)}`}
              >
                {o.appeal}
                <span className="block text-[10px] font-normal text-zinc-500">
                  apelo
                </span>
              </span>
            </button>
            {selected && (
              <Link
                href={`/ocorrencias/${o._id}`}
                className="block px-9 pb-3 text-xs font-medium text-blue-600 underline"
              >
                Ver detalhes da ocorrência
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
