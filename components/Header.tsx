import Link from "next/link";
import { NavLinks } from "./NavLinks";
import { LogoMark } from "./ui/Logo";
import { SoundToggle } from "./SoundToggle";

/**
 * Floating glass bar. On the map page it sits over the map (`overlay`);
 * elsewhere it sticks to the top of the page.
 */
export function Header({ overlay = false }: { overlay?: boolean }) {
  return (
    <header
      className={`pointer-events-none z-30 px-3 pt-3 ${
        overlay ? "absolute inset-x-0 top-0" : "sticky top-0"
      }`}
    >
      <div className="glass pointer-events-auto mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-full pr-2 pl-3">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 rounded-full"
        >
          <LogoMark />
          {/* Below 460px the menu takes the bar and the mark stands alone. */}
          <span className="text-[17px] font-semibold tracking-tight whitespace-nowrap max-[459px]:sr-only">
            Fiscaliz<span className="text-accent">.ai</span>
          </span>
          <span className="hidden truncate text-sm text-muted lg:inline">
            Ocorrências urbanas de Apucarana, PR
          </span>
        </Link>
        <div className="flex items-center gap-1 max-[459px]:flex-1 max-[459px]:justify-end">
          <NavLinks />
          <SoundToggle />
        </div>
      </div>
    </header>
  );
}
