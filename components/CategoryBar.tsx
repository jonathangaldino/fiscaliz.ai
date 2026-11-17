"use client";

import {
  CATEGORIES,
  CATEGORY_KEYS,
  type CategoryKey,
} from "@/convex/lib/categories";
import { useEffect, useRef, useState, type RefObject } from "react";
import { CategoryIcon } from "./ui/CategoryIcon";
import { Chip } from "./ui/Chip";

type Props = {
  /** Open occurrences per category, with the other filters applied. */
  counts: Partial<Record<CategoryKey, number>>;
  selected: CategoryKey | null;
  onChange: (category: CategoryKey | null) => void;
  /** "dock": big icons with labels over the map; "row": compact chips. */
  variant: "dock" | "row";
  className?: string;
};

/**
 * Filter by category with the category icons. Lists only categories with open
 * occurrences, plus the selected one, so the bar stays short.
 */
export function CategoryBar({
  counts,
  selected,
  onChange,
  variant,
  className = "",
}: Props) {
  const dockRef = useRef<HTMLDivElement>(null);
  const overflowing = useOverflow(dockRef);
  const keys = CATEGORY_KEYS.filter(
    (key) => (counts[key] ?? 0) > 0 || key === selected,
  );
  const total = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);

  if (variant === "row") {
    return (
      <div
        role="group"
        aria-label="Filtrar por categoria"
        className={`flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] ${className}`}
      >
        <Chip selected={selected === null} onClick={() => onChange(null)}>
          Todas <Count n={total} />
        </Chip>
        {keys.map((key) => (
          <Chip
            key={key}
            selected={selected === key}
            onClick={() => onChange(selected === key ? null : key)}
            icon={<CategoryIcon category={key} size={22} />}
            className="whitespace-nowrap pl-1.5"
          >
            {CATEGORIES[key].label}
            <Count n={counts[key] ?? 0} />
          </Chip>
        ))}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label="Filtrar por categoria"
      className={`glass flex max-w-full gap-1 overflow-x-auto rounded-panel p-1.5 [scrollbar-width:none] ${className}`}
      ref={dockRef}
      style={
        overflowing
          ? {
              maskImage:
                "linear-gradient(to right, black calc(100% - 2.5rem), transparent)",
            }
          : undefined
      }
    >
      {keys.map((key) => {
        const active = selected === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? null : key)}
            title={CATEGORIES[key].label}
            className={`group lit relative flex w-20 shrink-0 flex-col items-center gap-1 rounded-card px-1 pt-2 pb-1.5 transition-[background-color,transform] duration-(--dur) ease-out active:scale-95 ${
              active ? "bg-accent-tint" : "hover:bg-(--glass-bg-strong)"
            }`}
          >
            <CategoryIcon
              category={key}
              size={36}
              className="transition-transform duration-(--dur-slow) ease-spring group-hover:-translate-y-0.5 group-hover:scale-115 group-active:scale-95"
            />
            <span
              className={`line-clamp-1 w-full text-center text-[11px] leading-tight font-medium ${
                active ? "text-accent" : "text-muted"
              }`}
            >
              {shortLabel(key)}
            </span>
            <span className="absolute top-1 right-2 min-w-5 rounded-full bg-fg px-1.5 text-center text-[10px] leading-4 font-semibold text-bg">
              {counts[key] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Labels that fit under an icon. */
function shortLabel(key: CategoryKey): string {
  const SHORT: Partial<Record<CategoryKey, string>> = {
    pavement: "Buracos",
    public_spaces: "Praças",
    street_lighting: "Iluminação",
    traffic_signs: "Sinalização",
    public_transport: "Ônibus",
    tree_assessment: "Árvores",
    tree_removal: "Poda",
    construction: "Obras",
    urban_cleaning: "Limpeza",
    rural_roads: "Estradas",
  };
  return SHORT[key] ?? CATEGORIES[key].label;
}

function Count({ n }: { n: number }) {
  return (
    <span className="rounded-full bg-current/12 px-1.5 text-xs tabular-nums">
      {n}
    </span>
  );
}

/** True while the element's content is wider than the element. */
function useOverflow(ref: RefObject<HTMLElement | null>): boolean {
  const [overflowing, setOverflowing] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const check = () =>
      setOverflowing(element.scrollWidth > element.clientWidth + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return overflowing;
}
