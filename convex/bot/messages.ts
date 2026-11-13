/**
 * Every text the citizen reads, in pt-BR. Kept in one place so the tone is
 * consistent and reviewers can read the whole conversation at once.
 */
import { CATEGORIES, type AgencyInfo } from "../lib/categories";
import type { CompleteDraft, OutgoingMessage } from "./types";

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

export const askCorrection = () =>
  text("Sem problemas. O que precisa ser corrigido?");

export const notUrban = () =>
  text(
    "Eu só consigo registrar problemas urbanos de Apucarana, como buraco na rua, poste apagado ou entulho na calçada.",
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
      "Posso registrar?",
    ].join("\n"),
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

export function occurrenceLink(appUrl: string, occurrenceId: string): string {
  return `${appUrl.replace(/\/$/, "")}/ocorrencias/${occurrenceId}`;
}
