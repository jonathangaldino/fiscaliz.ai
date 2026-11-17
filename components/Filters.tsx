"use client";

import {
  AGENCIES,
  AGENCY_SLUGS,
  type AgencySlug,
} from "@/convex/lib/categories";
import { Glyph } from "./ui/Glyph";

/** Agency filter. Categories are filtered with the icon bar (CategoryBar). */
export function AgencyFilter({
  agency,
  onChange,
}: {
  agency: AgencySlug | null;
  onChange: (agency: AgencySlug | null) => void;
}) {
  return (
    <div className="relative">
      <label className="sr-only" htmlFor="filter-agency">
        Órgão responsável
      </label>
      <select
        id="filter-agency"
        value={agency ?? ""}
        onChange={(event) =>
          onChange((event.target.value || null) as AgencySlug | null)
        }
        className="h-9 w-full appearance-none rounded-full border border-line bg-(--glass-bg) pr-9 pl-3.5 text-sm font-medium text-fg transition-colors hover:bg-surface pointer-coarse:h-11"
      >
        <option value="">Todos os órgãos</option>
        {AGENCY_SLUGS.map((slug) => (
          <option key={slug} value={slug}>
            {AGENCIES[slug].name}
          </option>
        ))}
      </select>
      <Glyph
        name="chevronDown"
        size={16}
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
      />
    </div>
  );
}
