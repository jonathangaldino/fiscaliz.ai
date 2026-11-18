"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/** Live numbers from the public map, so the landing shows the city right now. */
export function LiveStats({ className = "" }: { className?: string }) {
  const active = useQuery(api.occurrences.listActive);
  const resolved = useQuery(api.occurrences.listResolved);
  if (!active || !resolved) return <div className={`h-12 ${className}`} />;

  const appeal = active.reduce((sum, o) => sum + o.appeal, 0);
  const stats = [
    {
      value: active.length,
      label: active.length === 1 ? "ocorrência aberta" : "ocorrências abertas",
    },
    { value: appeal, label: "pessoas pedindo solução" },
    {
      value: resolved.length,
      label: resolved.length === 1 ? "resolvida" : "resolvidas",
    },
  ];

  return (
    <div className={`flex flex-wrap items-center gap-x-6 gap-y-3 ${className}`}>
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-(--status-resolved) uppercase">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-current" />
        </span>
        Ao vivo
      </span>
      <dl className="flex flex-wrap gap-x-6 gap-y-2">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-baseline gap-1.5">
            <dt className="sr-only">{stat.label}</dt>
            <dd className="text-2xl font-semibold tracking-tight tabular-nums">
              {stat.value}
            </dd>
            <span aria-hidden className="text-sm text-muted">
              {stat.label}
            </span>
          </div>
        ))}
      </dl>
    </div>
  );
}
