"use client";

import {
  AGENCIES,
  AGENCY_SLUGS,
  CATEGORIES,
  CATEGORY_KEYS,
} from "@/convex/lib/categories";

type Props = {
  category: string | null;
  agency: string | null;
  onChange: (next: { category: string | null; agency: string | null }) => void;
};

const selectClass =
  "min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950";

export function Filters({ category, agency, onChange }: Props) {
  return (
    <div className="flex gap-2 border-b border-zinc-200 p-2 dark:border-zinc-800">
      <label className="sr-only" htmlFor="filter-category">
        Categoria
      </label>
      <select
        id="filter-category"
        className={selectClass}
        value={category ?? ""}
        onChange={(event) =>
          onChange({ category: event.target.value || null, agency })
        }
      >
        <option value="">Todas as categorias</option>
        {CATEGORY_KEYS.map((key) => (
          <option key={key} value={key}>
            {CATEGORIES[key].label}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="filter-agency">
        Órgão
      </label>
      <select
        id="filter-agency"
        className={selectClass}
        value={agency ?? ""}
        onChange={(event) =>
          onChange({ category, agency: event.target.value || null })
        }
      >
        <option value="">Todos os órgãos</option>
        {AGENCY_SLUGS.map((slug) => (
          <option key={slug} value={slug}>
            {AGENCIES[slug].name}
          </option>
        ))}
      </select>
    </div>
  );
}
