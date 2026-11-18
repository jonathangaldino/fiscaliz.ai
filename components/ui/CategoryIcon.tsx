import type { CategoryKey } from "@/convex/lib/categories";
import { CATEGORY_ICON } from "@/lib/categoryIcons";

/**
 * Category icon. Decorative by default (the label sits next to it); pass
 * `label` when the icon stands alone.
 */
export function CategoryIcon({
  category,
  size = 24,
  label,
  className = "",
}: {
  category: CategoryKey;
  size?: number;
  label?: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny static asset; next/image adds nothing here.
    <img
      src={CATEGORY_ICON[category]}
      width={size}
      height={size}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      draggable={false}
      className={`shrink-0 select-none object-contain ${className}`}
    />
  );
}
