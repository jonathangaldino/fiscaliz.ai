import { Glyph } from "./ui/Glyph";

/**
 * Yellow strip above every page: this is a Hack Brasil 2026 proposal, not a
 * service of the city hall. Not dismissible on purpose.
 */
export function HackathonBanner() {
  return (
    <aside
      aria-label="Aviso"
      className="relative z-40 shrink-0 border-b border-black/10 bg-[#ffd43b] px-4 py-2 text-[#2b2100]"
    >
      <p className="mx-auto flex max-w-6xl items-start justify-center gap-2 text-[13px] leading-snug sm:items-center sm:text-sm">
        <Glyph name="warning" size={16} className="mt-px sm:mt-0" />
        {/* Short copy on phones so the strip stays at two lines. */}
        <span className="sm:hidden">
          <strong className="font-semibold">Projeto do Hack Brasil 2026.</strong>{" "}
          Proposta independente, não é canal oficial da Prefeitura.
        </span>
        <span className="hidden sm:inline">
          <strong className="font-semibold">Projeto do Hack Brasil 2026.</strong>{" "}
          É uma proposta independente, sem vínculo com a Prefeitura de
          Apucarana, e não é um canal oficial de atendimento.
        </span>
      </p>
    </aside>
  );
}
