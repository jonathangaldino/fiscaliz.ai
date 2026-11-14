import type { Metadata } from "next";
import { Header } from "@/components/Header";

export const metadata: Metadata = { title: "Política de Privacidade · Fiscaliz.ai" };

const CONTACT_EMAIL = "jonathan@mugensoftware.com";
const UPDATED_AT = "13 de novembro de 2026";

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <article className="mx-auto w-full max-w-2xl space-y-6 p-6 text-sm leading-relaxed">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Política de Privacidade</h1>
          <p className="text-zinc-500">Atualizada em {UPDATED_AT}</p>
        </div>

        <Section title="Quem somos">
          <p>
            O Fiscaliz.ai recebe relatos de problemas urbanos de Apucarana, PR, pelo WhatsApp e os
            mostra num painel público para a população e a prefeitura. O serviço é operado pela
            MUGEN Software. Não vendemos dados e não mostramos anúncios.
          </p>
        </Section>

        <Section title="O que coletamos">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Número de telefone</strong>: para responder pelo WhatsApp e, depois, perguntar
              se o problema foi resolvido. Também guardamos uma versão cifrada (HMAC) dele para
              reconhecer relatos repetidos.
            </li>
            <li>
              <strong>Mensagens de texto</strong> que descrevem o problema.
            </li>
            <li>
              <strong>Mensagens de áudio</strong>: são transcritas em texto. O áudio não fica
              guardado.
            </li>
            <li>
              <strong>Localização</strong> do problema, enviada como pin ou endereço.
            </li>
          </ul>
          <p>
            Pedidos de emergência ou fora do escopo não viram relato: guardamos apenas uma contagem
            anônima, sem telefone, texto ou localização.
          </p>
        </Section>

        <Section title="O que fica público">
          <p>
            No painel aparecem só a categoria, um resumo escrito por IA sem dados pessoais, o
            endereço e a localização do problema, a situação e quantas pessoas relataram. Seu nome,
            telefone e o texto original nunca são publicados.
          </p>
        </Section>

        <Section title="Com quem compartilhamos">
          <p>Usamos estes serviços para operar o Fiscaliz.ai:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Meta (WhatsApp), para receber e enviar mensagens;</li>
            <li>Anthropic, para classificar o relato e escrever o resumo público;</li>
            <li>ElevenLabs, para transcrever áudios;</li>
            <li>Google Maps, para localizar endereços;</li>
            <li>Convex e Vercel, para guardar os dados e hospedar o site.</li>
          </ul>
        </Section>

        <Section title="Por quanto tempo">
          <p>
            Guardamos os dados enquanto o problema relatado estiver em acompanhamento, ou até você
            pedir a exclusão.
          </p>
        </Section>

        <Section title="Seus direitos">
          <p>
            Pela Lei Geral de Proteção de Dados (LGPD), você pode pedir acesso, correção ou exclusão
            dos seus dados. Escreva para{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
              {CONTACT_EMAIL}
            </a>{" "}
            informando o número de telefone usado. Ao excluir, apagamos seu telefone e seus relatos;
            a ocorrência pública pode continuar no painel, sem nenhum vínculo com você.
          </p>
        </Section>
      </article>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
