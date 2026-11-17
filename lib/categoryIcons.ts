import type { CategoryKey } from "@/convex/lib/categories";

/**
 * One 3D icon per category, 128 px WebP with transparency, in
 * public/icons/categories/. Typed as a Record so a new category without an
 * icon fails the typecheck.
 */
export const CATEGORY_ICON: Record<CategoryKey, string> = {
  pavement: "/icons/categories/pavement.webp",
  rural_roads: "/icons/categories/rural_roads.webp",
  drainage: "/icons/categories/drainage.webp",
  urban_cleaning: "/icons/categories/urban_cleaning.webp",
  public_spaces: "/icons/categories/public_spaces.webp",
  street_lighting: "/icons/categories/street_lighting.webp",
  traffic_light: "/icons/categories/traffic_light.webp",
  traffic_signs: "/icons/categories/traffic_signs.webp",
  public_transport: "/icons/categories/public_transport.webp",
  risk_area: "/icons/categories/risk_area.webp",
  tree_assessment: "/icons/categories/tree_assessment.webp",
  tree_removal: "/icons/categories/tree_removal.webp",
  environmental: "/icons/categories/environmental.webp",
  construction: "/icons/categories/construction.webp",
  cemeteries: "/icons/categories/cemeteries.webp",
  rural_area: "/icons/categories/rural_area.webp",
  other: "/icons/categories/other.webp",
};
