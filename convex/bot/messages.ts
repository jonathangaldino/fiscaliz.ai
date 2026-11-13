/**
 * Every text the citizen reads, in pt-BR. Kept in one place so the tone is
 * consistent and reviewers can read the whole conversation at once.
 */
import { CATEGORIES, type AgencyInfo } from "../lib/categories";
import type {
  CompleteDraft,
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
    "Olá! Eu sou o Fiscaliza.i, o canal para avisar a Prefeitura de Apucarana sobre problemas na cidade, como buraco na rua, poste apagado ou entulho na calçada. Qual é o problema e onde ele está?",
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
    "Eu entendo mensagens de texto, áudio e localização. Pode me contar o problema por um desses meios?",
  );

export const audioFailed = () =>
  text(
    "Não consegui entender o áudio. Pode mandar de novo ou escrever a mensagem?",
  );

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
): OutgoingMessage {
  const routing = agency
    ? `Órgão responsável: ${agency.name}.`
    : "Essa categoria ainda não tem um órgão responsável definido; a Prefeitura fará a triagem.";
  return text(
    `Relato registrado! ✅ ${routing}\nAcompanhe no mapa: ${link}`,
  );
}

export function appealAdded(link: string, appeal: number): OutgoingMessage {
  return text(
    `Esse problema já tinha sido relatado. Seu apelo foi somado: agora são ${appeal} pessoas pedindo a solução. 🙌\nAcompanhe no mapa: ${link}`,
  );
}

export function alreadyReported(link: string): OutgoingMessage {
  return text(
    `Você já relatou esse problema, e seu apelo já está contado. Obrigado!\nAcompanhe no mapa: ${link}`,
  );
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
