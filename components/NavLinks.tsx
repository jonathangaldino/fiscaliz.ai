"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: {
  href: string;
  label: string;
  short?: string;
  /** Only from this width up, to keep the bar on one line on phones. */
  wide?: boolean;
}[] = [
  { href: "/mapa", label: "Mapa" },
  { href: "/resolvidas", label: "Resolvidas" },
  { href: "/simular", label: "Simular relato", short: "Simular" },
  { href: "/metricas", label: "Métricas", wide: true },
  { href: "/confiabilidade", label: "Confiabilidade", wide: true },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Principal">
      <ul className="flex items-center gap-1">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <li
              key={link.href}
              className={link.wide ? "hidden md:block" : undefined}
            >
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`lit inline-flex h-10 items-center rounded-full px-3 sm:px-3.5 text-sm font-medium transition-colors duration-(--dur) ${
                  active
                    ? "bg-fg text-bg"
                    : "text-muted hover:bg-accent-tint hover:text-fg"
                }`}
              >
                {link.short ? (
                  <>
                    <span className="sm:hidden">{link.short}</span>
                    <span className="hidden sm:inline">{link.label}</span>
                  </>
                ) : (
                  link.label
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
