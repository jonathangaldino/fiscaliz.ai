"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: { href: string; label: string; short?: string }[] = [
  { href: "/", label: "Mapa" },
  { href: "/resolvidas", label: "Resolvidas" },
  { href: "/simular", label: "Simular relato", short: "Simular" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Principal">
      <ul className="flex items-center gap-1">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex h-10 items-center rounded-full px-3 sm:px-3.5 text-sm font-medium transition-colors duration-(--dur) ${
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
