import type { Metadata } from "next";
import { Header } from "@/components/Header";

export const metadata: Metadata = { title: "Política de Privacidade · Fiscaliz.ai" };

const CONTACT_EMAIL = "jonathan@mugensoftware.com";
const UPDATED_AT = "21 de novembro de 2026";

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main id="conteudo">
      <article className="glass-strong mx-auto my-6 w-[calc(100%-2rem)] max-w-2xl space-y-6 rounded-panel p-6 text-[15px] leading-relaxed sm:p-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Política de Privacidade</h1>
          <p className="text-muted">Atualizada em {UPDATED_AT}</p>
        </div>

        <Section title="Quem somos">
          <p>
            O Fiscaliz.ai recebe relatos de problemas urbanos de Apucarana, PR, pelo Telegram e os
            mostra num painel público para a população e a prefeitura. O serviço é operado pela
            MUGEN Software. Não vendemos dados e não mostramos anúncios.
          </p>
        </Section>

        <Section title="O que coletamos">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Identificador do chat no Telegram</strong>: um número que o Telegram atribui à
              conversa com o bot. Serve para responder e, depois, perguntar se o problema foi
              resolvido. Também guardamos uma versão cifrada (HMAC) dele para reconhecer relatos
              repetidos. Não pedimos nem guardamos seu telefone, nome ou usuário do Telegram.
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
            <li>
              <strong>Foto</strong> do problema, se você mandar uma: rostos e placas de veículos são
              borrados antes de publicar. A foto original é apagada assim que a cópia borrada fica
              pronta; só a cópia borrada fica guardada.
            </li>
          </ul>
          <p>
            Pedidos de emergência ou fora do escopo não viram relato: guardamos apenas uma contagem
            anônima, sem identificador, texto ou localização.
          </p>
        </Section>

        <Section title="O que fica público">
          <p>
            No painel aparecem só a categoria, um resumo escrito por IA sem dados pessoais, o
            endereço e a localização do problema, a situação, quantas pessoas relataram e, se houver, a
            primeira foto enviada, com rostos e placas borrados. A foto continua no painel depois que
            o problema é resolvido. Seu nome,
            sua conta do Telegram e o texto original nunca são publicados.
          </p>
        </Section>

        <Section title="Com quem compartilhamos">
          <p>Usamos estes serviços para operar o Fiscaliz.ai:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Telegram, para receber e enviar mensagens;</li>
            <li>Anthropic, para classificar o relato e escrever o resumo público;</li>
            <li>ElevenLabs, para transcrever áudios;</li>
            <li>Modal, para borrar rostos e placas nas fotos (a foto não fica guardada lá);</li>
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
            com o pedido. Para achar seus dados, vamos pedir que você mande uma mensagem ao bot no
            Telegram. Ao excluir, apagamos o identificador do seu chat e seus relatos;
            a ocorrência pública pode continuar no painel, sem nenhum vínculo com você.
          </p>
        </Section>
      </article>
      </main>
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
