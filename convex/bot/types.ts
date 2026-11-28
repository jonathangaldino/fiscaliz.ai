import type { Infer } from "convex/values";
import { z } from "zod/v4";
import { CATEGORY_KEYS } from "../lib/categories";
import { PICKUP_ITEMS, type PickupItem } from "../lib/pickup";
import type {
  conversationStateValidator,
  draftPhotoValidator,
  draftValidator,
  geocodeSourceValidator,
  incomingMessageValidator,
  outgoingMessageValidator,
} from "../validators";

export type Draft = Infer<typeof draftValidator>;
export type ConversationState = Infer<typeof conversationStateValidator>;
export type IncomingMessage = Infer<typeof incomingMessageValidator>;
export type OutgoingMessage = Infer<typeof outgoingMessageValidator>;
export type GeocodeSource = Infer<typeof geocodeSourceValidator>;
export type DraftPhoto = Infer<typeof draftPhotoValidator>;

/** A draft with everything needed to register a report. The photo is optional. */
export type CompleteDraft = Required<
  Omit<Draft, "photo" | "intent" | "items" | "complement" | "addressKey">
> &
  Pick<Draft, "photo">;

/** A draft with everything needed to register a pickup request (ADR 0011). */
export type CompletePickupDraft = Draft & {
  intent: "pickup";
  items: PickupItem[];
  description: string;
  address: string;
  lat: number;
  lng: number;
};

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
    .enum(["urban", "pickup", "pickup_refused", "emergency", "out_of_scope", "invalid"])
    .describe(
      "urban: problema de zeladoria urbana; pickup: o próprio cidadão quer descartar móveis, colchões, sofás, eletrodomésticos ou eletroeletrônicos; pickup_refused: quer descartar entulho ou madeira que não seja de móvel; emergency: risco à vida, saúde ou segurança; out_of_scope: água/esgoto (Sanepar) ou rede elétrica (Copel); invalid: não é problema urbano",
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
  pickupItems: z
    .array(z.enum(PICKUP_ITEMS))
    .nullable()
    .describe("Só para pickup: tipos de item que o cidadão vai descartar"),
  complement: z
    .string()
    .nullable()
    .describe("Complemento do endereço (apartamento, bloco, casa dos fundos), separado da rua e do número"),
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
  /** Street + number of a typed address (ADR 0011); absent for a pin. */
  addressKey?: string;
};

export type StepInput = {
  receivedAt: number;
  extraction: Extraction | null;
  location: ResolvedLocation | null;
  decision: "yes" | "no" | null;
  /** The citizen wrote an address, but the geocoder found nothing specific. */
  addressNotFound: boolean;
  /** Reports the citizen confirmed today (Brasília). */
  reportsToday: number;
  /** Photo sent in this message; replaces the one in the draft. */
  photo?: DraftPhoto;
};

export type AnonymousCounter =
  | { kind: "emergency"; target: EmergencyTarget | "unknown" }
  | { kind: "out_of_scope"; target: OutOfScopeTarget | "unknown" }
  | { kind: "pickup_refused"; target: "debris" };

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
  | { type: "register"; draft: CompleteDraft }
  /** The citizen confirmed a pickup request. */
  | { type: "register_pickup"; draft: CompletePickupDraft };
