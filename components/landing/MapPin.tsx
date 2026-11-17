import { CATEGORIES, type CategoryKey } from "@/convex/lib/categories";
import { CategoryIcon } from "../ui/CategoryIcon";

/**
 * The map pin as HTML, for illustrations outside the map (same look as
 * lib/mapPins.ts draws on the canvas).
 */
export function MapPin({
  category,
  size = 48,
  verifying = false,
  className = "",
}: {
  category: CategoryKey;
  size?: number;
  verifying?: boolean;
  className?: string;
}) {
  const color = CATEGORIES[category].color;
  return (
    <span
      aria-hidden
      className={`relative inline-flex flex-col items-center drop-shadow-[0_4px_8px_rgb(15_23_20/0.25)] ${className}`}
      style={{ width: size, height: size * 1.2 }}
    >
      <span
        className="relative z-10 flex items-center justify-center rounded-full bg-white"
        style={{
          width: size,
          height: size,
          boxShadow: `inset 0 0 0 ${size * 0.055}px ${color}`,
        }}
      >
        <CategoryIcon category={category} size={Math.round(size * 0.6)} />
      </span>
      <span
        className="-mt-[22%] rotate-45 rounded-[2px] bg-white"
        style={{ width: size * 0.32, height: size * 0.32 }}
      />
      {verifying && (
        <span
          className="absolute top-0 right-0 z-20 rounded-full border-2 border-white bg-amber-500"
          style={{ width: size * 0.32, height: size * 0.32 }}
        />
      )}
    </span>
  );
}
