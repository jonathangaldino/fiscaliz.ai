/**
 * Every text the citizen reads, in pt-BR. Kept in one place so the tone is
 * consistent and reviewers can read the whole conversation at once.
 */
import { CATEGORIES, type AgencyInfo } from "../lib/categories";
import { PICKUP_ITEM_LABEL, type PickupItem } from "../lib/pickup";
import type {
  CompleteDraft,
  CompletePickupDraft,
  EmergencyTarget,
  OutgoingMessage,
  OutOfScopeTarget,
} from "./types";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

const text = (value: string): OutgoingMessage => ({ text: value });

export const askProblem = () =>
  text(
    "Olá! Eu sou o Fiscaliz.ai, um serviço independente que registra problemas urbanos de Apucarana, como buraco na rua, poste apagado ou entulho na calçada, e os encaminha à Prefeitura. Não sou o canal oficial da Prefeitura. Dúvidas: suporte@mugensoftware.com\n\nQual é o problema e onde ele está? Se quiser, mande uma foto também.\n\nVai jogar fora móveis, colchão, sofá ou eletrodoméstico? Também registro o pedido de recolhimento.",
  );

export const askDescription = () =>
  text("Qual é o problema? Conte em poucas palavras o que está acontecendo.");

export const askLocation = () =>
  text(
    "Onde fica? Mande a localização pelo clipe 📎 (no simulador, clique no mapa) ou escreva o endereço com rua e número.",
  );

export const outsideCity = () =>
  text(
    "Esse local fica fora de Apucarana. Eu só registro problemas dentro do município. Pode mandar outro local?",
  );

export const addressNotFound = () =>
  text(
    "Não encontrei esse endereço em Apucarana. Pode mandar a localização pelo clipe 📎 (no simulador, clique no mapa) ou escrever a rua com número e bairro?",
  );

export const askCorrection = () =>
  text("Sem problemas. O que precisa ser corrigido?");

export const notUrban = () =>
  text(
    "Eu só consigo registrar problemas urbanos de Apucarana, como buraco na rua, poste apagado ou entulho na calçada.",
  );

export const unsupported = () =>
  text(
    "Eu entendo mensagens de texto, áudio, foto e localização. Pode me contar o problema por um desses meios?",
  );

export const audioFailed = () =>
  text(
    "Não consegui entender o áudio. Pode mandar de novo ou escrever a mensagem?",
  );

export const photoReceived = (replaced: boolean) =>
  text(replaced ? "📷 Foto atualizada." : "📷 Recebi a foto.");

export const photoPublished = (link: string) =>
  text(`📷 Foto publicada, com rostos e placas borrados: ${link}`);

export const photoFailed = () =>
  text(
    "📷 Não consegui publicar a foto. O registro continua feito, só sem a imagem.",
  );

const PHOTO_PENDING =
  "📷 Sua foto está sendo anonimizada (rostos e placas borrados) e aparece no link em instantes.";

export const tryAgain = () =>
  text(
    "Desculpe, não consegui processar sua mensagem agora. Pode mandar de novo em alguns instantes?",
  );

export function summary(draft: CompleteDraft): OutgoingMessage {
  return {
    text: [
      "Confere o relato:",
      `• Problema: ${draft.summary}`,
      `• Categoria: ${CATEGORIES[draft.category].label}`,
      `• Local: ${draft.address}`,
      `• Quando: ${dateTime.format(draft.occurredAt)}`,
      draft.photo ? "• 📷 Foto anexada" : null,
      "",
      draft.precise
        ? null
        : "📍 Encontrei só a rua, sem o número exato. Se puder, mande a localização pelo clipe para marcar o ponto certo.",
      "Posso registrar?",
    ]
      .filter((line) => line !== null)
      .join("\n"),
    buttons: [
      { id: "yes", title: "SIM" },
      { id: "no", title: "NÃO" },
    ],
  };
}

export function registered(
  link: string,
  agency: AgencyInfo | null,
  photoPending = false,
): OutgoingMessage {
  const routing = agency
    ? `Órgão responsável: ${agency.name}.`
    : "Essa categoria ainda não tem um órgão responsável definido; a Prefeitura fará a triagem.";
  return text(
    `Relato registrado! ✅ ${routing}\nAcompanhe no mapa: ${link}${photoPending ? `\n${PHOTO_PENDING}` : ""}`,
  );
}

export function appealAdded(
  link: string,
  appeal: number,
  photoPending = false,
): OutgoingMessage {
  return text(
    `Esse problema já tinha sido relatado. Seu apelo foi somado: agora são ${appeal} pessoas pedindo a solução. 🙌\nAcompanhe no mapa: ${link}${photoPending ? `\n${PHOTO_PENDING}` : ""}`,
  );
}

export function alreadyReported(link: string): OutgoingMessage {
  return text(
    `Você já relatou esse problema, e seu apelo já está contado. Obrigado!\nAcompanhe no mapa: ${link}`,
  );
}

export function mapLink(appUrl: string): string {
  return `${appUrl.replace(/\/$/, "")}/mapa`;
}

export function occurrenceLink(appUrl: string, occurrenceId: string): string {
  return `${appUrl.replace(/\/$/, "")}/ocorrencias/${occurrenceId}`;
}

const EMERGENCY_CHANNELS: Record<EmergencyTarget, string> = {
  police: "Polícia Militar: 190",
  samu: "SAMU: 192",
  firefighters: "Corpo de Bombeiros: 193",
  civil_defense: "Defesa Civil: 199",
};

/** Emergencies go straight to the emergency numbers; nothing is registered. */
export function emergency(target: EmergencyTarget | null): OutgoingMessage {
  const main = target ? EMERGENCY_CHANNELS[target] : null;
  const all = Object.values(EMERGENCY_CHANNELS).join(" · ");
  return text(
    [
      "⚠️ Isso parece uma emergência. Ligue agora:",
      main ? `*${main}*` : null,
      "",
      `Outros canais: ${all}.`,
      "Este canal não aciona socorro e não registrou sua mensagem.",
    ]
      .filter((line) => line !== null)
      .join("\n"),
  );
}

const UTILITY_CHANNELS: Record<OutOfScopeTarget, string> = {
  sanepar:
    "Água e esgoto são com a Sanepar: 0800 200 0115 (24 horas) ou o aplicativo Sanepar Mobile.",
  copel:
    "Rede elétrica é com a Copel: 0800 51 00 116 ou o aplicativo da Copel. Lâmpada de poste queimada é com a Prefeitura: pode me mandar que eu registro.",
};

/** Utility problems are not the city's; point to the right channel. */
export function outOfScope(target: OutOfScopeTarget | null): OutgoingMessage {
  const channel = target
    ? UTILITY_CHANNELS[target]
    : `${UTILITY_CHANNELS.sanepar}\n${UTILITY_CHANNELS.copel}`;
  return text(
    `Esse problema não é da Prefeitura, é de concessionária. ${channel}\nNão registrei sua mensagem.`,
  );
}

export const dailyLimit = (limit: number) =>
  text(
    `Você já registrou ${limit} relatos hoje, o limite diário. Amanhã você pode mandar novos relatos. Obrigado por ajudar a cidade!`,
  );

/**
 * V2: the question sent to Telegram and simulator citizens.
 */
export function verificationQuestion(
  occurrence: { summary: string; address: string },
  link: string,
  buttons: { yes: string; no: string },
): OutgoingMessage {
  return {
    text: [
      "Olá! Você relatou um problema em Apucarana pelo Fiscaliz.ai:",
      "",
      occurrence.summary,
      `Local: ${occurrence.address}`,
      "",
      "Esse problema já foi resolvido?",
      `Ver ocorrência: ${link}`,
    ].join("\n"),
    buttons: [
      { id: buttons.yes, title: "SIM, resolvido" },
      { id: buttons.no, title: "NÃO, continua" },
    ],
  };
}

export const verificationCounted = () =>
  text("Obrigado! Sua resposta foi registrada.");

export const verificationResolved = (link: string) =>
  text(
    `Obrigado! Com as respostas de quem relatou, a ocorrência foi marcada como resolvida. ✅\n${link}`,
  );

export const verificationReopened = (link: string) =>
  text(`Obrigado! A ocorrência continua aberta no mapa.\n${link}`);

export const verificationClosed = () =>
  text("Essa verificação já terminou. Obrigado por responder!");

// Furniture pickup (ADR 0011). The service is the city's; the protocol is ours.

const PICKUP_RULES = [
  "Deixe os itens na calçada. A partir de agora o caminhão da Secretaria de Serviços Públicos pode passar a qualquer momento; com chuva, pode atrasar.",
  "Recolhemos: móveis, colchões, sofás, eletrodomésticos e eletroeletrônicos.",
  "Não recolhemos: madeira que não seja de móvel nem qualquer outro entulho.",
].join("\n");

const itemList = (items: readonly PickupItem[]) =>
  items.map((item) => PICKUP_ITEM_LABEL[item]).join(", ");

export const askPickupItems = () =>
  text(
    "Posso registrar o pedido de recolhimento. O que você vai descartar? Móveis, colchões, sofás, eletrodomésticos ou eletroeletrônicos.",
  );

export const askPickupLocation = () =>
  text(
    "Qual é o endereço onde os itens vão ficar? Escreva a rua com o número (e o complemento, se tiver) ou mande a localização pelo clipe 📎 (no simulador, clique no mapa).",
  );

export const askPickupNumber = () =>
  text(
    "Encontrei a rua, mas preciso do número para o caminhão parar no lugar certo. Pode mandar o número ou a localização pelo clipe 📎?",
  );

export const pickupRefused = () =>
  text(
    "Esse serviço não recolhe madeira que não seja de móvel nem outro tipo de entulho. Para entulho de obra, procure uma empresa de caçamba. Não registrei sua mensagem.",
  );

export function pickupSummary(draft: CompletePickupDraft): OutgoingMessage {
  return {
    text: [
      "Confere o pedido de recolhimento:",
      `• Itens: ${itemList(draft.items)}`,
      `• Local: ${draft.address}${draft.complement ? ` (${draft.complement})` : ""}`,
      draft.photo ? "• 📷 Foto anexada" : null,
      "",
      "Posso registrar?",
    ]
      .filter((line) => line !== null)
      .join("\n"),
    buttons: [
      { id: "yes", title: "SIM" },
      { id: "no", title: "NÃO" },
    ],
  };
}

export function pickupRegistered(
  protocol: string,
  already: boolean,
  photoPending = false,
): OutgoingMessage {
  const head = already
    ? `Você já tem um pedido de recolhimento nesse endereço. Seu protocolo Fiscaliz.ai continua o ${protocol}.`
    : `Pedido de recolhimento registrado! ✅ Seu protocolo Fiscaliz.ai é o ${protocol}.`;
  return text(
    [
      head,
      "Esse número é do Fiscaliz.ai, não é um protocolo oficial da Prefeitura.",
      "",
      PICKUP_RULES,
      photoPending ? `\n${PHOTO_PENDING}` : null,
    ]
      .filter((line) => line !== null)
      .join("\n"),
  );
}

export function pickupQuestion(
  point: { address: string },
  buttons: { yes: string; no: string },
): OutgoingMessage {
  return {
    text: `Olá! Você pediu pelo Fiscaliz.ai o recolhimento de móveis em ${point.address}.\n\nO caminhão já passou e recolheu?`,
    buttons: [
      { id: buttons.yes, title: "SIM, recolheram" },
      { id: buttons.no, title: "NÃO, ainda não" },
    ],
  };
}

export const pickupCollected = () =>
  text("Obrigado! Marcamos o recolhimento como feito e o ponto saiu do mapa. ✅");

export const pickupStillWaiting = () =>
  text("Obrigado! O ponto continua no mapa, aguardando o caminhão.");

export const pickupExpired = (address: string) =>
  text(
    `Seu pedido de recolhimento em ${address} completou 15 dias sem confirmação e saiu do mapa. Se os itens ainda estiverem na calçada, faça um novo pedido.`,
  );
