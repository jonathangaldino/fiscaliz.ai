import Link from "next/link";

export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <Link href="/" className="flex items-baseline gap-2">
        <span className="text-lg font-bold">Fiscaliz.ai</span>
        <span className="hidden text-sm text-zinc-500 sm:inline">
          Ocorrências urbanas de Apucarana, PR
        </span>
      </Link>
      <nav className="flex gap-4 text-sm">
        <Link href="/" className="hover:underline">
          Mapa
        </Link>
        <Link href="/simular" className="hover:underline">
          Simular relato
        </Link>
      </nav>
    </header>
  );
}
