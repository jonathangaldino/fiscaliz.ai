"use client";

import { useEffect, useRef } from "react";
import type { PublicOccurrence } from "@/convex/occurrences";
import { AGENCIES, CATEGORIES, type AgencySlug } from "@/convex/lib/categories";
import { formatAppeal, formatDate } from "@/lib/format";
import { CategoryIcon } from "./ui/CategoryIcon";
import { Glyph } from "./ui/Glyph";
import { StatusBadge } from "./ui/StatusBadge";

type Props = {
  occurrences: PublicOccurrence[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  emptyMessage?: string;
};

export function OccurrenceList({
  occurrences,
  selectedId,
  onSelect,
  emptyMessage = "Nenhuma ocorrência aberta.",
}: Props) {
  const listRef = useRef<HTMLUListElement>(null);

  // A pin tapped on the map brings its row into view.
  useEffect(() => {
    if (!selectedId) return;
    listRef.current
      ?.querySelector(`[data-id="${selectedId}"]`)
      ?.scrollIntoView({
        block: "nearest",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
  }, [selectedId]);

  if (occurrences.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-sm text-muted">{emptyMessage}</p>
    );
  }
  return (
    <ul ref={listRef} className="space-y-1 px-2 pb-2">
      {occurrences.map((o) => {
        const category = CATEGORIES[o.category];
        const agency = o.agencySlug
          ? AGENCIES[o.agencySlug as AgencySlug]
          : null;
        const selected = o._id === selectedId;
        return (
          <li key={o._id} data-id={o._id}>
            <button
              type="button"
              onClick={() => onSelect?.(o._id)}
              aria-current={selected ? "true" : undefined}
              className={`group lit flex w-full items-start gap-3 rounded-card p-2.5 text-left transition-[background-color,box-shadow,transform] duration-(--dur) active:scale-[0.99] ${
                selected
                  ? "bg-accent-tint ring-1 ring-(--accent)/30"
                  : "hover:bg-(--glass-bg-strong)"
              }`}
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-control border border-line bg-surface/70">
                <CategoryIcon
                  category={o.category}
                  size={30}
                  className="transition-transform duration-(--dur-slow) ease-spring group-hover:scale-110"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-xs font-medium text-muted">
                  <span className="truncate">{category.label}</span>
                  {o.status === "verifying" && (
                    <StatusBadge status="verifying" />
                  )}
                </span>
                <span className="mt-0.5 block text-[15px] leading-snug font-medium text-fg">
                  {o.summary}
                </span>
                <span className="mt-0.5 block truncate text-xs text-subtle">
                  {o.address} · {formatDate(o.openedAt)}
                  {agency ? ` · ${agency.name}` : ""}
                </span>
              </span>
              <span
                className="flex shrink-0 flex-col items-center pt-0.5 text-fg"
                title={`Apelo: ${formatAppeal(o.appeal)}`}
              >
                <span
                  aria-hidden
                  className="text-base leading-none font-semibold tabular-nums"
                >
                  {o.appeal}
                </span>
                <Glyph name="people" size={14} className="mt-1 text-subtle" />
                <span className="sr-only">Apelo: {formatAppeal(o.appeal)}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
