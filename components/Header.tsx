import Link from "next/link";
import { NavLinks } from "./NavLinks";
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
          className="flex min-w-0 items-center gap-2.5 rounded-full"
          aria-label="Fiscaliz.ai, ir para o mapa"
        >
          <LogoMark />
          <span className="hidden text-[17px] font-semibold tracking-tight min-[420px]:inline">
            Fiscaliz.ai
          </span>
          <span className="hidden truncate text-sm text-muted lg:inline">
            Ocorrências urbanas de Apucarana, PR
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <NavLinks />
          <SoundToggle />
        </div>
      </div>
    </header>
  );
}

function LogoMark() {
  return (
    <span
      aria-hidden
      className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#2b8cff] to-[#0b4fa8] shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_2px_6px_-1px_rgb(11_79_168/0.5)]"
    >
      <svg viewBox="0 0 24 24" className="size-[18px]" fill="none">
        <path
          d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 1 1 13 0c0 5.4-6.5 11-6.5 11Z"
          fill="white"
        />
        <circle cx="12" cy="10" r="2.6" fill="#0b5fc6" />
      </svg>
    </span>
  );
}
