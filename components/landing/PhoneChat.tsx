import type { ReactNode } from "react";
import { LogoMark } from "../ui/Logo";

/**
 * A WhatsApp conversation with the bot, as an illustration. The texts follow
 * convex/bot/messages.ts. Hidden from screen readers: the steps next to it
 * say the same thing in prose.
 */
export function PhoneChat({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`relative w-[300px] shrink-0 rounded-[3rem] bg-[#0b0d0c] p-2.5 shadow-[0_40px_80px_-30px_rgb(11_40_90/0.55),0_0_0_1px_rgb(255_255_255/0.08)_inset] ${className}`}
    >
      <div className="relative overflow-hidden rounded-[2.4rem] bg-[#efeae2] dark:bg-[#0b141a]">
        {/* Notch */}
        <div className="absolute top-2 left-1/2 z-20 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
        {/* Chat header */}
        <div className="flex items-center gap-2.5 bg-[#f7f7f7] px-4 pt-11 pb-2.5 dark:bg-[#202c33]">
          <LogoMark size={34} />
          <div className="min-w-0">
            <p className="text-[13px] leading-tight font-semibold text-[#111b21] dark:text-[#e9edef]">
              Fiscaliz.ai
            </p>
            <p className="text-[11px] text-[#4f5e66] dark:text-[#d1d7db]">
              Conta comercial
            </p>
          </div>
        </div>
        <div className="space-y-1.5 px-2.5 py-3 text-[12.5px] leading-snug text-[#111b21] dark:text-[#e9edef]">
          <Bubble from="me" time="18:02">
            tem um buraco enorme na rua ponta grossa, quase caí de bicicleta
          </Bubble>
          <Bubble from="bot" time="18:02">
            Onde fica? Mande a localização pelo clipe 📎 ou escreva o endereço
            com rua e número.
          </Bubble>
          <Bubble from="me" time="18:03">
            <span className="mb-1 block h-16 overflow-hidden rounded-md bg-[radial-gradient(circle_at_50%_55%,#d93025_0_5px,transparent_6px),linear-gradient(115deg,#f2efe9_0_38%,#fff_38%_44%,#e8eee4_44%_70%,#fff_70%_76%,#f2efe9_76%)]" />
            📍 Rua Ponta Grossa, Centro
          </Bubble>
          <Bubble from="bot" time="18:03">
            <b>Confere o relato:</b>
            <br />• Problema: buraco grande na faixa da direita
            <br />• Categoria: Buracos / pavimento
            <br />• Local: Rua Ponta Grossa, Centro
            <br />
            Posso registrar?
            <span className="mt-1.5 flex gap-1 border-t border-black/5 pt-1.5 dark:border-white/10">
              <span className="flex-1 rounded-md py-1 text-center font-semibold text-[#027eb5] dark:text-[#53bdeb]">
                SIM
              </span>
              <span className="flex-1 rounded-md py-1 text-center font-semibold text-[#027eb5] dark:text-[#53bdeb]">
                NÃO
              </span>
            </span>
          </Bubble>
          <Bubble from="me" time="18:03">
            SIM
          </Bubble>
          <Bubble from="bot" time="18:03">
            Relato registrado! ✅ Órgão responsável: Secretaria de Serviços
            Públicos.
            <br />
            <span className="text-[#027eb5] underline dark:text-[#53bdeb]">
              Acompanhe no mapa
            </span>
          </Bubble>
        </div>
      </div>
    </div>
  );
}

function Bubble({
  from,
  time,
  children,
}: {
  from: "me" | "bot";
  time: string;
  children: ReactNode;
}) {
  const mine = from === "me";
  return (
    <div
      className={`relative max-w-[86%] rounded-lg px-2 pt-1 pb-3.5 shadow-[0_1px_0.5px_rgb(0_0_0/0.13)] ${
        mine
          ? "ml-auto rounded-tr-none bg-[#d9fdd3] dark:bg-[#005c4b]"
          : "rounded-tl-none bg-white dark:bg-[#202c33]"
      }`}
    >
      {children}
      <span className="absolute right-1.5 bottom-0.5 text-[9.5px] text-[#4f5e66] dark:text-[#d1d7db]">
        {time}
        {mine && (
          <span className="ml-0.5 text-[#0a6c99] dark:text-[#a6dcf5]">✓✓</span>
        )}
      </span>
    </div>
  );
}
