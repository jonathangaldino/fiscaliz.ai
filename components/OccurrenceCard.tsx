"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { PublicOccurrence } from "@/convex/occurrences";
import {
  AGENCIES,
  CATEGORIES,
  dialablePhone,
  type AgencySlug,
} from "@/convex/lib/categories";
import { formatAppeal, formatDate } from "@/lib/format";
import { buttonClass } from "./ui/Button";
import { CategoryIcon } from "./ui/CategoryIcon";
import { Glyph } from "./ui/Glyph";
import { StatusBadge } from "./ui/StatusBadge";

/**
 * The card that opens when a pin is tapped: what, where, how many people and
 * who is responsible, with the next steps.
 */
export function OccurrenceCard({
  occurrence,
  onClose,
  autoFocus = false,
  className = "",
}: {
  occurrence: PublicOccurrence;
  onClose: () => void;
  /** Move focus into the card when it opens (the phone, where it replaces the list). */
  autoFocus?: boolean;
  className?: string;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (autoFocus) closeRef.current?.focus();
  }, [autoFocus, occurrence._id]);

  const category = CATEGORIES[occurrence.category];
  const agency = occurrence.agencySlug
    ? AGENCIES[occurrence.agencySlug as AgencySlug]
    : null;
  const titleId = `occurrence-card-${occurrence._id}`;

  return (
    <section
      aria-labelledby={titleId}
      data-occurrence-card
      className={`glass-strong animate-[card-in_var(--dur-slow)_var(--ease-spring)] rounded-panel p-4 text-left ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-card border border-line bg-surface/80 shadow-sm">
          <CategoryIcon category={occurrence.category} size={40} />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-muted">
              {category.label}
            </span>
            <StatusBadge status={occurrence.status} />
          </div>
          <h2
            id={titleId}
            className="mt-1 text-[17px] leading-snug font-semibold text-fg"
          >
            {occurrence.summary}
          </h2>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="-mt-1 -mr-1 flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-accent-tint hover:text-fg pointer-coarse:size-11"
        >
          <Glyph name="close" size={18} />
        </button>
      </div>

      <p className="mt-3 text-sm text-muted">{occurrence.address}</p>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat label="Apelo" value={String(occurrence.appeal)}>
          {formatAppeal(occurrence.appeal)}
        </Stat>
        <Stat
          label="Aberta em"
          value={formatDate(occurrence.openedAt).slice(0, 5)}
        >
          {formatDate(occurrence.openedAt)}
        </Stat>
        <Stat label="Órgão" value={agency ? shortAgency(agency.name) : "—"}>
          {agency?.name ?? "Sem órgão definido"}
        </Stat>
      </dl>

      <div className="mt-4 flex items-center gap-2">
        <Link
          href={`/ocorrencias/${occurrence._id}`}
          className={buttonClass({ variant: "primary", className: "flex-1" })}
        >
          Ver detalhes
        </Link>
        {agency && (
          <>
            <Link
              href={`/orgaos/${agency.slug}`}
              className={buttonClass({ variant: "glass", className: "flex-1" })}
            >
              Fila do órgão
            </Link>
            <a
              href={`tel:${dialablePhone(agency.phone)}`}
              aria-label={`Ligar para ${agency.name}`}
              title={`Ligar: ${agency.phone}`}
              className={buttonClass({
                variant: "glass",
                className: "w-11 px-0",
              })}
            >
              <Glyph name="phone" size={18} />
            </a>
          </>
        )}
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  children,
}: {
  label: string;
  /** Short form shown in the tile. */
  value: string;
  /** Full form for screen readers and the tooltip. */
  children: string;
}) {
  return (
    <div
      className="rounded-control border border-line bg-surface/60 px-2 py-2"
      title={children}
    >
      <dt className="text-[11px] font-medium text-subtle">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-semibold text-fg">
        <span aria-hidden>{value}</span>
        <span className="sr-only">{children}</span>
      </dd>
    </div>
  );
}

/** "Secretaria de Serviços Públicos" fits a tile as "Serviços Públicos". */
function shortAgency(name: string): string {
  return name.replace(/^Secretaria de /, "");
}
