import type { ReactNode } from "react";
import { LogoMark } from "../ui/Logo";

/**
 * A Telegram conversation with the bot, as an illustration. The texts follow
 * convex/bot/messages.ts. Hidden from screen readers: the steps next to it
 * say the same thing in prose.
 */
export function PhoneChat({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`relative w-[300px] shrink-0 rounded-[3rem] bg-[#0b0d0c] p-2.5 shadow-[0_40px_80px_-30px_rgb(11_40_90/0.55),0_0_0_1px_rgb(255_255_255/0.08)_inset] ${className}`}
    >
      <div className="relative overflow-hidden rounded-[2.4rem] bg-[linear-gradient(160deg,#d7e8c4_0%,#b4d3a8_45%,#8fc1b5_100%)] dark:bg-[linear-gradient(160deg,#0e1621_0%,#111d2b_100%)]">
        {/* Notch */}
        <div className="absolute top-2 left-1/2 z-20 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
        {/* Chat header: back, name centered, avatar on the right */}
        <div className="flex items-center gap-2 bg-white/95 px-3 pt-11 pb-2 dark:bg-[#17212b]">
          <span className="w-10 text-[22px] leading-none text-[#2481cc] dark:text-[#6ab3f3]">‹</span>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-[13px] leading-tight font-semibold text-black dark:text-white">
              Fiscaliz.ai
            </p>
            <p className="text-[11px] text-[#8d8e90] dark:text-[#708499]">bot</p>
          </div>
          <span className="flex w-10 justify-end">
            <LogoMark size={30} />
          </span>
        </div>
        <div className="space-y-1.5 px-2.5 py-3 text-[12.5px] leading-snug text-black dark:text-white">
          <Bubble from="me" time="18:02">
            tem um buraco enorme na rua ponta grossa, quase caí de bicicleta
          </Bubble>
          <Bubble from="bot" time="18:02">
            Onde fica? Mande a localização pelo clipe 📎 ou escreva o endereço
            com rua e número.
          </Bubble>
          <Bubble from="me" time="18:03">
            <span className="mb-1 block h-16 overflow-hidden rounded-xl bg-[radial-gradient(circle_at_50%_55%,#d93025_0_5px,transparent_6px),linear-gradient(115deg,#f2efe9_0_38%,#fff_38%_44%,#e8eee4_44%_70%,#fff_70%_76%,#f2efe9_76%)]" />
            📍 Rua Ponta Grossa, Centro
          </Bubble>
          <div>
            <Bubble from="bot" time="18:03">
              <b>Confere o relato:</b>
              <br />• Problema: buraco grande na faixa da direita
              <br />• Categoria: Buracos / pavimento
              <br />• Local: Rua Ponta Grossa, Centro
              <br />
              Posso registrar?
            </Bubble>
            {/* Inline keyboard: buttons sit under the message, not inside it */}
            <div className="mt-1 flex max-w-[86%] gap-1">
              {["SIM", "NÃO"].map((label) => (
                <span
                  key={label}
                  className="flex-1 rounded-lg bg-black/20 py-1.5 text-center text-[12px] font-semibold text-white backdrop-blur-sm dark:bg-[#182533]/80"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
          <Bubble from="me" time="18:03">
            SIM
          </Bubble>
          <Bubble from="bot" time="18:03">
            Relato registrado! ✅ Órgão responsável: Secretaria de Serviços
            Públicos.
            <br />
            <span className="text-[#2481cc] underline dark:text-[#6ab3f3]">
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
      className={`relative w-fit max-w-[86%] rounded-2xl px-2.5 pt-1.5 pb-4 shadow-[0_1px_1px_rgb(0_0_0/0.12)] ${
        mine
          ? "ml-auto rounded-br-md bg-[#effdde] dark:bg-[#2b5278]"
          : "rounded-bl-md bg-white dark:bg-[#182533]"
      }`}
    >
      {children}
      <span
        className={`absolute right-2 bottom-1 text-[9.5px] ${
          mine ? "text-[#5dad5a] dark:text-[#7da8d3]" : "text-[#a0acb6] dark:text-[#6d7f8f]"
        }`}
      >
        {time}
        {mine && <span className="ml-0.5">✓✓</span>}
      </span>
    </div>
  );
}
