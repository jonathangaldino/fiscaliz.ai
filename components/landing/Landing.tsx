import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  AGENCIES,
  CATEGORIES,
  CATEGORY_KEYS,
  type CategoryKey,
} from "@/convex/lib/categories";
import {
  REPOSITORY_URL,
  WHATSAPP_LINK,
  WHATSAPP_NUMBER,
  WHATSAPP_QR,
} from "@/lib/contact";
import { buttonClass } from "../ui/Button";
import { CategoryIcon } from "../ui/CategoryIcon";
import { Glyph, type GlyphName } from "../ui/Glyph";
import { Logo } from "../ui/Logo";
import { LiveStats } from "./LiveStats";
import { MapPin } from "./MapPin";
import { PhoneChat } from "./PhoneChat";
import { Reveal } from "./Reveal";
import { Section } from "./Section";
import { VideoPlayer } from "./VideoPlayer";

/** Categories citizens can report, without the catch-all "other". */
const REPORTABLE = CATEGORY_KEYS.filter((key) => key !== "other");

export function Landing() {
  return (
    <main id="conteudo" className="overflow-x-clip">
      <Hero />
      <Steps />
      <Video />
      <Categories />
      <MapGuide />
      <CityHall />
      <Privacy />
      <Faq />
      <FinalCall />
      <Footer />
    </main>
  );
}

/* ------------------------------------------------------------------ hero */

function Hero() {
  return (
    <section
      aria-labelledby="hero-titulo"
      className="relative mx-auto grid w-full max-w-6xl items-center gap-14 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-20 lg:pb-28"
    >
      <div className="relative z-10 text-center lg:text-left">
        <Reveal>
          <p className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium">
            <span className="size-2 rounded-full bg-(--status-resolved) shadow-[0_0_0_3px_var(--status-resolved-tint)]" />
            Apucarana, PR · Hack Brasil 2026
          </p>
        </Reveal>
        <Reveal delay={0.05}>
          <h1
            id="hero-titulo"
            className="mt-6 text-[clamp(2.75rem,7vw,5rem)] leading-[1.02] font-semibold tracking-[-0.035em] text-balance"
          >
            Você aponta.
            <br />
            <span className="bg-gradient-to-r from-[#2b8cff] via-[#0b5fc6] to-[#16a34a] bg-clip-text text-transparent dark:from-[#8cc0ff] dark:via-[#6aaeff] dark:to-[#86efac]">
              A cidade resolve.
            </span>
          </h1>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-pretty text-muted sm:text-xl lg:mx-0">
            Viu um buraco, um poste apagado ou entulho na calçada? Conte pelo
            WhatsApp, em texto ou áudio. A inteligência artificial entende,
            encaminha para o órgão certo da Prefeitura e põe o problema num mapa
            aberto para todo mundo.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noreferrer"
              className={buttonClass({
                className:
                  "h-13 w-full px-6 text-base shadow-[0_10px_30px_-10px_rgb(11_95_198/0.7)] sm:w-auto",
              })}
            >
              <WhatsAppIcon />
              Relatar pelo WhatsApp
              <span className="sr-only">(abre o WhatsApp)</span>
            </a>
            <Link
              href="/mapa"
              className={buttonClass({
                variant: "glass",
                className: "h-13 w-full px-6 text-base sm:w-auto",
              })}
            >
              Ver o mapa
              <Glyph name="chevronRight" size={18} />
            </Link>
          </div>
        </Reveal>
        <Reveal delay={0.2}>
          <LiveStats className="mt-8 justify-center lg:justify-start" />
        </Reveal>
      </div>

      <div className="relative mx-auto flex justify-center">
        {/* Soft halo behind the phone */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 m-auto size-[120%] rounded-full bg-[radial-gradient(closest-side,rgb(43_140_255/0.28),transparent)] blur-2xl"
        />
        <Reveal delay={0.1}>
          <PhoneChat className="rotate-[-3deg]" />
        </Reveal>
        <FloatingPin
          category="pavement"
          className="top-[8%] -left-6 sm:-left-14"
          delay="0s"
        />
        <FloatingPin
          category="street_lighting"
          className="top-[40%] -right-4 sm:-right-16"
          delay="-2s"
          verifying
        />
        <FloatingPin
          category="traffic_light"
          className="bottom-[10%] -left-2 sm:-left-12"
          delay="-4s"
        />
        <div
          aria-hidden
          className="float glass-strong absolute -right-2 bottom-[2%] hidden w-56 rounded-card p-3 sm:-right-10 sm:block"
          style={{ animationDelay: "-1s" }}
        >
          <div className="flex items-center gap-2.5">
            <CategoryIcon category="pavement" size={30} />
            <div className="min-w-0">
              <p className="text-xs text-subtle">
                Secretaria de Serviços Públicos
              </p>
              <p className="truncate text-sm font-semibold">
                Buraco na faixa da direita
              </p>
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs">
            <span className="font-semibold text-(--status-open)">Aberta</span>
            <span className="flex items-center gap-1 text-muted">
              <Glyph name="people" size={14} />
              14 pedindo
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function FloatingPin({
  category,
  className,
  delay,
  verifying,
}: {
  category: CategoryKey;
  className: string;
  delay: string;
  verifying?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={`float absolute ${className}`}
      style={{ animationDelay: delay }}
    >
      <MapPin category={category} size={58} verifying={verifying} />
    </span>
  );
}

/* ----------------------------------------------------------------- steps */

const STEPS: { title: string; text: ReactNode; icon: GlyphName }[] = [
  {
    title: "Conte o problema",
    text: (
      <>
        Mande uma mensagem para <b>{WHATSAPP_NUMBER}</b>. Escreva ou grave um
        áudio, do jeito que você falaria com alguém:{" "}
        <i>“tem um buraco enorme na rua, quase caí de bicicleta”</i>.
      </>
    ),
    icon: "mail",
  },
  {
    title: "Mostre onde é",
    text: (
      <>
        Toque no clipe 📎 e envie a <b>localização</b>, ou escreva o endereço
        com rua e número. Só vale dentro de Apucarana.
      </>
    ),
    icon: "locate",
  },
  {
    title: "Confirme com SIM",
    text: (
      <>
        O bot mostra um resumo com a categoria e o local. Tocou em <b>SIM</b>,
        está registrado: você recebe o órgão responsável e o link para
        acompanhar no mapa.
      </>
    ),
    icon: "external",
  },
];

function Steps() {
  return (
    <Section
      id="como-relatar"
      eyebrow="Como relatar"
      title="Três mensagens. Menos de um minuto."
      lead="Não precisa baixar aplicativo, fazer cadastro nem saber qual secretaria procurar. O Fiscaliz.ai faz essa parte."
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr_1fr_0.95fr]">
        {STEPS.map((step, index) => (
          <Reveal key={step.title} delay={index * 0.06}>
            <article className="glass-strong lit lift h-full rounded-panel p-6">
              <div className="flex items-center justify-between">
                <span className="flex size-11 items-center justify-center rounded-full bg-accent-solid text-lg font-semibold text-on-accent tabular-nums">
                  {index + 1}
                </span>
                <Glyph name={step.icon} size={22} className="text-subtle" />
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-tight">
                {step.title}
              </h3>
              <p className="mt-2 leading-relaxed text-muted">{step.text}</p>
            </article>
          </Reveal>
        ))}
        <Reveal delay={0.18}>
          <aside
            aria-label="Número do WhatsApp"
            className="relative h-full overflow-hidden rounded-panel bg-gradient-to-br from-[#2b8cff] to-[#0a4596] p-6 text-white shadow-[0_20px_50px_-20px_rgb(11_79_168/0.7)]"
          >
            <p className="text-sm font-medium text-white/80">
              WhatsApp do Fiscaliz.ai
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
              {WHATSAPP_NUMBER}
            </p>
            <div className="mt-5 hidden rounded-card bg-white p-3 lg:block">
              <svg
                viewBox={`0 0 ${WHATSAPP_QR.size} ${WHATSAPP_QR.size}`}
                className="w-full text-[#0b0d0c]"
                shapeRendering="crispEdges"
                role="img"
                aria-label="QR code que abre a conversa com o Fiscaliz.ai no WhatsApp"
              >
                <path d={WHATSAPP_QR.path} fill="currentColor" />
              </svg>
            </div>
            <p className="mt-3 hidden text-sm text-white/80 lg:block">
              Aponte a câmera do celular.
            </p>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[#0a4596] transition-transform active:scale-95 lg:hidden"
            >
              <WhatsAppIcon />
              Abrir conversa
            </a>
            <p className="mt-4 text-sm text-white/80">
              Sem celular por perto?{" "}
              <Link
                href="/simular"
                className="font-semibold text-white underline"
              >
                Teste no simulador
              </Link>
              .
            </p>
          </aside>
        </Reveal>
      </div>
    </Section>
  );
}

/* ----------------------------------------------------------------- video */

function Video() {
  return (
    <Section
      id="video"
      eyebrow="Em 1 minuto"
      title="Do aviso à solução"
      lead="Veja o caminho de um relato: da mensagem no WhatsApp até a confirmação de que o problema foi resolvido."
    >
      <Reveal>
        <VideoPlayer />
      </Reveal>
    </Section>
  );
}

/* ------------------------------------------------------------ categories */

function Categories() {
  return (
    <Section
      id="o-que-relatar"
      eyebrow="O que dá para relatar"
      title="Os problemas da rua, cada um no seu órgão"
      lead="A IA escolhe a categoria e, com ela, a secretaria responsável, seguindo as competências oficiais da Prefeitura de Apucarana."
    >
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {REPORTABLE.map((key, index) => {
          const category = CATEGORIES[key];
          const agency = category.agency ? AGENCIES[category.agency] : null;
          return (
            <li key={key}>
              <Reveal delay={(index % 5) * 0.04}>
                <div className="glass-strong lit lift group flex h-full flex-col items-center rounded-card px-3 pt-5 pb-4 text-center">
                  <CategoryIcon
                    category={key}
                    size={64}
                    className="transition-transform duration-(--dur-slow) ease-spring group-hover:-translate-y-1 group-hover:scale-110"
                  />
                  <p className="mt-3 text-[15px] leading-snug font-semibold">
                    {category.label}
                  </p>
                  <p className="mt-1 text-xs leading-snug text-subtle">
                    {category.examples}
                  </p>
                  {agency && (
                    <p className="mt-auto pt-3 text-[11px] font-semibold text-accent">
                      {agency.name.replace(/^Secretaria de /, "")}
                    </p>
                  )}
                </div>
              </Reveal>
            </li>
          );
        })}
      </ul>

      <Reveal>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Notice
            tone="danger"
            title="Emergência não é aqui"
            text="Árvore em cima dos fios, acidente, incêndio: ligue 193 (Bombeiros), 192 (SAMU), 190 (Polícia) ou 199 (Defesa Civil). O bot avisa e não registra."
          />
          <Notice
            tone="neutral"
            title="Água, esgoto e rede elétrica"
            text="São das concessionárias: Sanepar (água e esgoto) e Copel (fios e transformadores). O bot indica o canal certo. Iluminação pública continua com a Prefeitura."
          />
        </div>
      </Reveal>
    </Section>
  );
}

function Notice({
  tone,
  title,
  text,
}: {
  tone: "danger" | "neutral";
  title: string;
  text: string;
}) {
  return (
    <div
      className={`glass-strong flex gap-4 rounded-panel p-5 ${
        tone === "danger" ? "border-l-4 border-l-danger" : ""
      }`}
    >
      <span
        aria-hidden
        className={`flex size-10 shrink-0 items-center justify-center rounded-full text-lg ${
          tone === "danger"
            ? "bg-danger/12 text-danger"
            : "bg-accent-tint text-accent"
        }`}
      >
        {tone === "danger" ? "!" : "i"}
      </span>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- map guide */

function MapGuide() {
  return (
    <Section
      id="como-ler-o-mapa"
      eyebrow="Como ler o mapa"
      title="Cada pin conta uma história"
      lead="O mapa é público e atualiza sozinho. Quem relata e quem resolve olham para a mesma coisa."
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Legend
          title="O ícone é o problema"
          text="Cada categoria tem seu ícone e sua cor. Filtre pelo ícone na parte de baixo do mapa."
        >
          <MapPin category="drainage" size={52} />
          <MapPin category="tree_removal" size={52} />
          <MapPin category="traffic_signs" size={52} />
        </Legend>
        <Legend
          title="Tamanho é apelo"
          text="Quando outras pessoas relatam o mesmo problema, ele não se repete: o pin cresce. Apelo é quantas pessoas pedem a solução."
        >
          <MapPin category="pavement" size={36} />
          <MapPin category="pavement" size={48} />
          <MapPin category="pavement" size={62} />
        </Legend>
        <Legend
          title="Ponto âmbar: verificando"
          text="A Prefeitura avisou que resolveu? Perguntamos a quem relatou. Com 30% de SIM, a ocorrência vira resolvida."
        >
          <MapPin category="street_lighting" size={56} verifying />
        </Legend>
        <Legend
          title="Círculo com número"
          text="Vários problemas perto um do outro viram um grupo. Toque para aproximar. As resolvidas saem do mapa e vão para o histórico."
        >
          <span
            aria-hidden
            className="flex size-16 items-center justify-center rounded-full bg-surface text-lg font-semibold shadow-[0_0_0_7px_rgb(11_95_198/0.22)]"
          >
            8
          </span>
        </Legend>
      </div>
      <Reveal>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/mapa" className={buttonClass({ className: "px-6" })}>
            Abrir o mapa
            <Glyph name="chevronRight" size={18} />
          </Link>
          <Link
            href="/resolvidas"
            className={buttonClass({ variant: "glass", className: "px-6" })}
          >
            Ver as resolvidas
          </Link>
        </div>
      </Reveal>
    </Section>
  );
}

function Legend({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children: ReactNode;
}) {
  return (
    <Reveal className="h-full">
      <article className="glass-strong lit flex h-full flex-col rounded-panel p-6">
        <div className="flex h-24 items-end justify-center gap-3 rounded-card bg-[linear-gradient(115deg,var(--bg)_0_40%,var(--surface)_40%_46%,var(--bg)_46%)] px-3 pb-3">
          {children}
        </div>
        <h3 className="mt-5 text-lg font-semibold tracking-tight">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
      </article>
    </Reveal>
  );
}

/* -------------------------------------------------------------- city hall */

const CITY_FEATURES: { title: string; text: string }[] = [
  {
    title: "Triagem sem planilha",
    text: "A mensagem chega classificada, com resumo, endereço e ponto no mapa. Ninguém precisa ler, separar e repassar.",
  },
  {
    title: "Direto para o órgão certo",
    text: "Cada categoria tem um responsável, conforme as competências oficiais. Buraco vai para Serviços Públicos; iluminação, para o Idepplan.",
  },
  {
    title: "Prioridade pelo apelo",
    text: "Relatos do mesmo problema viram uma ocorrência só. A fila de cada órgão mostra primeiro o que afeta mais gente.",
  },
  {
    title: "Resolvido de verdade",
    text: "Depois do conserto, o bot pergunta a quem relatou se o problema acabou. A ocorrência só fecha com a confirmação do cidadão.",
  },
  {
    title: "Transparência pública",
    text: "O mapa e as filas são abertos e em tempo real. A população vê o que foi pedido, o que está em andamento e o que já foi feito.",
  },
  {
    title: "Emergência no canal certo",
    text: "Pedidos de socorro e assuntos de concessionárias são desviados na hora, sem ocupar a fila da zeladoria.",
  },
];

function CityHall() {
  return (
    <Section
      id="prefeitura"
      eyebrow="Para a Prefeitura"
      title="Saber onde agir, para quem e em que ordem"
      lead="O Fiscaliz.ai transforma mensagens soltas em uma fila organizada por órgão e por quantas pessoas cada problema afeta."
    >
      <div className="grid items-start gap-8 lg:grid-cols-[1.25fr_1fr]">
        <ul className="grid gap-4 sm:grid-cols-2">
          {CITY_FEATURES.map((feature, index) => (
            <li key={feature.title}>
              <Reveal delay={(index % 2) * 0.05}>
                <div className="glass-strong lit h-full rounded-panel p-5">
                  <h3 className="font-semibold tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {feature.text}
                  </p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
        <Reveal delay={0.1}>
          <QueuePreview />
        </Reveal>
      </div>
    </Section>
  );
}

const QUEUE: { category: CategoryKey; summary: string; appeal: number }[] = [
  {
    category: "pavement",
    summary: "Buraco grande na faixa da direita",
    appeal: 14,
  },
  {
    category: "drainage",
    summary: "Boca de lobo entupida; a rua alaga",
    appeal: 12,
  },
  {
    category: "public_spaces",
    summary: "Piso quebrado na pista de caminhada",
    appeal: 10,
  },
  {
    category: "urban_cleaning",
    summary: "Entulho bloqueando a calçada",
    appeal: 6,
  },
];

function QueuePreview() {
  return (
    <figure className="glass-strong rounded-panel p-5 lg:sticky lg:top-24">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span>
          <span className="block text-xs font-medium text-subtle">
            Fila do órgão
          </span>
          <span className="block text-lg font-semibold tracking-tight">
            Secretaria de Serviços Públicos
          </span>
        </span>
        <span className="text-xs text-subtle">exemplo</span>
      </figcaption>
      <ol className="mt-4 space-y-1">
        {QUEUE.map((row, index) => (
          <li
            key={row.summary}
            className="flex items-center gap-3 rounded-card p-2"
          >
            <span className="w-4 text-right text-sm font-semibold text-subtle tabular-nums">
              {index + 1}
            </span>
            <span className="flex size-11 items-center justify-center rounded-control border border-line bg-surface/70">
              <CategoryIcon category={row.category} size={30} />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {row.summary}
            </span>
            <span className="text-right">
              <span className="block text-base leading-none font-semibold tabular-nums">
                {row.appeal}
              </span>
              <span className="text-[11px] text-subtle">apelo</span>
            </span>
          </li>
        ))}
      </ol>
      <Link
        href="/orgaos/servicos-publicos"
        className={buttonClass({
          variant: "glass",
          size: "sm",
          className: "mt-4 w-full",
        })}
      >
        Ver a fila de verdade
        <Glyph name="chevronRight" size={16} />
      </Link>
    </figure>
  );
}

/* --------------------------------------------------------------- privacy */

function Privacy() {
  const points = [
    {
      title: "Seu nome e telefone não aparecem",
      text: "O mapa mostra só categoria, um resumo sem dados pessoais, o endereço do problema e quantas pessoas relataram.",
    },
    {
      title: "Áudio vira texto e é descartado",
      text: "A gravação é transcrita para entender o problema e não fica guardada.",
    },
    {
      title: "Código aberto",
      text: "O projeto é open source: qualquer pessoa pode ver como os dados são tratados.",
    },
  ];
  return (
    <Section
      id="privacidade"
      eyebrow="Privacidade"
      title="Público é o problema, não você"
    >
      <div className="grid gap-4 md:grid-cols-3">
        {points.map((point, index) => (
          <Reveal key={point.title} delay={index * 0.05}>
            <div className="h-full rounded-panel border border-line p-6">
              <h3 className="font-semibold tracking-tight">{point.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {point.text}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        Detalhes na{" "}
        <Link
          href="/privacidade"
          className="font-semibold text-accent underline"
        >
          Política de Privacidade
        </Link>
        .
      </p>
    </Section>
  );
}

/* ------------------------------------------------------------------- FAQ */

const FAQ: { q: string; a: ReactNode }[] = [
  {
    q: "Preciso baixar algum aplicativo?",
    a: "Não. É uma conversa no WhatsApp, com um número oficial do bot. Para olhar o mapa, basta o navegador.",
  },
  {
    q: "Posso mandar áudio?",
    a: "Pode. O áudio é transcrito automaticamente e o bot segue a conversa como se você tivesse escrito.",
  },
  {
    q: "E se alguém já tiver relatado o mesmo problema?",
    a: "O Fiscaliz.ai reconhece relatos do mesmo problema no mesmo lugar e soma o seu apoio à ocorrência que já existe. É isso que faz o apelo crescer.",
  },
  {
    q: "Como sei que foi resolvido?",
    a: "Quando a Prefeitura conserta, o bot pergunta a quem relatou se o problema acabou. Com confirmação suficiente, a ocorrência sai do mapa e vai para a lista de resolvidas.",
  },
  {
    q: "Funciona em qualquer cidade?",
    a: "Por enquanto, só em Apucarana, PR. Os endereços são conferidos com a base de ruas do IBGE da cidade.",
  },
  {
    q: "Tem limite de relatos?",
    a: "Cada telefone pode confirmar até 5 relatos por dia, para evitar abuso.",
  },
];

function Faq() {
  return (
    <Section id="duvidas" eyebrow="Dúvidas" title="Perguntas frequentes">
      <div className="mx-auto max-w-3xl space-y-3">
        {FAQ.map((item) => (
          <details
            key={item.q}
            className="glass-strong group rounded-card px-5 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold">
              {item.q}
              <Glyph
                name="chevronDown"
                size={18}
                className="text-subtle transition-transform duration-(--dur) group-open:rotate-180"
              />
            </summary>
            <p className="pb-5 leading-relaxed text-muted">{item.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------- final CTA */

function FinalCall() {
  return (
    <section
      aria-labelledby="chamada-titulo"
      className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6"
    >
      <Reveal>
        <div className="relative grid items-center gap-6 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#2b8cff] via-[#0b5fc6] to-[#0a3f86] px-6 py-14 text-center text-white shadow-[0_40px_80px_-40px_rgb(11_79_168/0.8)] sm:px-12 lg:grid-cols-[1.1fr_1fr] lg:py-10 lg:text-left">
          <div
            aria-hidden
            className="absolute -top-24 -right-24 size-72 rounded-full bg-white/10 blur-2xl"
          />
          <div>
            <h2
              id="chamada-titulo"
              className="text-[clamp(2rem,5vw,3.5rem)] leading-tight font-semibold tracking-tight text-balance"
            >
              Viu um problema? Aponta.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/85 lg:mx-0">
              Uma mensagem sua ajuda a Prefeitura a saber onde agir, e mostra
              para todo mundo o que a cidade precisa.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-white px-7 text-base font-semibold text-[#0a4596] shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.97]"
              >
                <WhatsAppIcon />
                Relatar pelo WhatsApp
                <span className="sr-only">(abre o WhatsApp)</span>
              </a>
              <Link
                href="/mapa"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-full border border-white/40 bg-white/10 px-7 text-base font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
              >
                Ver o mapa
              </Link>
            </div>
          </div>
          <Image
            src="/landing/cidade.webp"
            alt=""
            width={1100}
            height={810}
            sizes="(min-width: 1024px) 520px, 90vw"
            className="float mx-auto w-full max-w-[520px] drop-shadow-[0_30px_40px_rgb(0_20_60/0.45)]"
          />
        </div>
      </Reveal>
    </section>
  );
}

/* ---------------------------------------------------------------- footer */

function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <Logo size={30} />
          <p className="mt-2 text-muted">
            Projeto open source do Hack Brasil 2026 para Apucarana, PR.
          </p>
        </div>
        <nav aria-label="Rodapé">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-muted">
            <li>
              <Link className="hover:text-fg" href="/mapa">
                Mapa
              </Link>
            </li>
            <li>
              <Link className="hover:text-fg" href="/resolvidas">
                Resolvidas
              </Link>
            </li>
            <li>
              <Link className="hover:text-fg" href="/simular">
                Simulador
              </Link>
            </li>
            <li>
              <Link className="hover:text-fg" href="/privacidade">
                Privacidade
              </Link>
            </li>
            <li>
              <a
                className="hover:text-fg"
                href={REPOSITORY_URL}
                target="_blank"
                rel="noreferrer"
              >
                GitHub<span className="sr-only"> (abre em nova aba)</span>
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
      <path d="M12.04 2a9.9 9.9 0 0 0-8.5 15l-1.4 5 5.1-1.3A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3a8.2 8.2 0 1 1 6.9 3.8Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.3-.4.8-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3Z" />
    </svg>
  );
}
