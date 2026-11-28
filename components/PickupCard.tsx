"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { PICKUP_ITEM_LABEL } from "@/convex/lib/pickup";
import type { PublicPickupPoint } from "@/convex/pickups";
import { formatDate } from "@/lib/format";
import { buttonClass } from "./ui/Button";
import { CategoryIcon } from "./ui/CategoryIcon";
import { Glyph } from "./ui/Glyph";

/** Card for a furniture pickup point (ADR 0011): where, what, how many requests. */
export function PickupCard({
  point,
  onClose,
  autoFocus = false,
  className = "",
}: {
  point: PublicPickupPoint;
  onClose: () => void;
  autoFocus?: boolean;
  className?: string;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (autoFocus) closeRef.current?.focus();
  }, [autoFocus, point._id]);
  const titleId = `pickup-card-${point._id}`;

  return (
    <section
      aria-labelledby={titleId}
      data-occurrence-card
      className={`glass-strong animate-[card-in_var(--dur-slow)_var(--ease-spring)] rounded-panel p-4 text-left ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-card border border-line bg-surface/80 shadow-sm">
          <CategoryIcon category="urban_cleaning" size={40} />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <span className="text-xs font-semibold text-muted">
            Recolhimento de móveis · aguardando
          </span>
          <h2 id={titleId} className="mt-1 text-[17px] leading-snug font-semibold text-fg">
            {point.items.map((item) => PICKUP_ITEM_LABEL[item]).join(", ")}
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

      <p className="mt-3 text-sm text-muted">{point.address}</p>
      <p className="mt-1 text-sm text-muted">
        {point.requests === 1 ? "1 pedido" : `${point.requests} pedidos`} · desde{" "}
        {formatDate(point.openedAt)}
      </p>
      {point.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- Convex storage URL, already anonymized.
        <img
          src={point.photoUrl}
          alt="Foto dos itens, com rostos e placas borrados"
          className="mt-3 max-h-40 w-full rounded-card object-cover"
        />
      )}

      <p className="mt-3 text-xs text-subtle">
        Serviço gratuito da Secretaria de Serviços Públicos. O caminhão recolhe na calçada.
      </p>
      <Link
        href="/orgaos/servicos-publicos"
        className={buttonClass({ variant: "glass", className: "mt-3 w-full" })}
      >
        Fila do órgão
      </Link>
    </section>
  );
}
