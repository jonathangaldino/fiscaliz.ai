import type { Infer } from "convex/values";
import { z } from "zod/v4";
import { CATEGORY_KEYS } from "../lib/categories";
import type {
  conversationStateValidator,
  draftValidator,
  incomingMessageValidator,
  outgoingMessageValidator,
} from "../validators";

export type Draft = Infer<typeof draftValidator>;
export type ConversationState = Infer<typeof conversationStateValidator>;
export type IncomingMessage = Infer<typeof incomingMessageValidator>;
export type OutgoingMessage = Infer<typeof outgoingMessageValidator>;

/** A draft with everything needed to register a report. */
export type CompleteDraft = Required<Draft>;

export const EMERGENCY_TARGETS = [
  "police",
  "samu",
  "firefighters",
  "civil_defense",
] as const;
export type EmergencyTarget = (typeof EMERGENCY_TARGETS)[number];

export const OUT_OF_SCOPE_TARGETS = ["sanepar", "copel"] as const;
export type OutOfScopeTarget = (typeof OUT_OF_SCOPE_TARGETS)[number];

/**
 * What the AI extracts from one citizen message. The AI only fills this in;
 * the state machine decides what happens next (ADR 0004).
 */
export const extractionSchema = z.object({
  kind: z
    .enum(["urban", "emergency", "out_of_scope", "invalid"])
    .describe(
      "urban: problema de zeladoria urbana; emergency: risco à vida, saúde ou segurança; out_of_scope: água/esgoto (Sanepar) ou rede elétrica (Copel); invalid: não é problema urbano",
    ),
  emergencyTarget: z.enum(EMERGENCY_TARGETS).nullable(),
  outOfScopeTarget: z.enum(OUT_OF_SCOPE_TARGETS).nullable(),
  category: z.enum(CATEGORY_KEYS).nullable(),
  description: z
    .string()
    .nullable()
    .describe("Descrição do problema com as palavras do cidadão"),
  address: z
    .string()
    .nullable()
    .describe("Endereço citado na mensagem: rua, número, bairro ou referência"),
  occurredAt: z
    .string()
    .nullable()
    .describe(
      "Data/hora ISO 8601 com fuso -03:00, só se o cidadão disser quando aconteceu",
    ),
  publicSummary: z
    .string()
    .nullable()
    .describe(
      "Resumo curto e neutro do problema para o painel público, sem nomes, telefones ou dados pessoais",
    ),
});

export type Extraction = z.infer<typeof extractionSchema>;

/** Location resolved by the action (pin or geocoded address). */
export type ResolvedLocation = {
  lat: number;
  lng: number;
  address: string;
  precise: boolean;
};

export type StepInput = {
  receivedAt: number;
  extraction: Extraction | null;
  location: ResolvedLocation | null;
  decision: "yes" | "no" | null;
};

export type AnonymousCounter =
  | { kind: "emergency"; target: EmergencyTarget | "unknown" }
  | { kind: "out_of_scope"; target: OutOfScopeTarget | "unknown" };

export type Step =
  /** Keep talking: save the new state (or drop it, when null) and reply. */
  | {
      type: "reply";
      state: ConversationState | null;
      messages: OutgoingMessage[];
      /** Anonymous record to store (ADR 0001). */
      counter?: AnonymousCounter;
    }
  /** The citizen confirmed: register the report. */
  | { type: "register"; draft: CompleteDraft };
