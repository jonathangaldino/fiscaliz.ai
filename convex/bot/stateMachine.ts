/**
 * Conversation flow as a pure function (ADR 0004). The AI only fills in the
 * Extraction; this code decides what happens next. No I/O here.
 */
import { CATEGORIES } from "../lib/categories";
import * as messages from "./messages";
import type {
  CompleteDraft,
  ConversationState,
  Draft,
  Extraction,
  OutgoingMessage,
  ResolvedLocation,
  Step,
  StepInput,
} from "./types";

/** Reads a SIM/NÃO answer from a button or from free text. */
export function parseDecision(
  text: string | undefined,
  button: "yes" | "no" | undefined,
): "yes" | "no" | null {
  if (button) return button;
  if (!text) return null;
  const normalized = text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[.!]+$/, "");
  if (/^(sim|s|isso|pode|pode sim|confirmo|ok|certo)$/.test(normalized)) {
    return "yes";
  }
  if (/^(nao|n|errado|cancela)$/.test(normalized)) return "no";
  return null;
}

/** Merges new information into the draft. New values win over old ones. */
export function mergeDraft(
  draft: Draft,
  extraction: Extraction | null,
  location: ResolvedLocation | null,
  receivedAt: number,
): Draft {
  const next: Draft = { ...draft };
  if (extraction?.kind === "urban") {
    if (extraction.category) next.category = extraction.category;
    if (extraction.description) {
      next.description = draft.description
        ? `${draft.description}\n${extraction.description}`
        : extraction.description;
    }
    if (extraction.publicSummary) next.summary = extraction.publicSummary;
    if (extraction.occurredAt) {
      const parsed = Date.parse(extraction.occurredAt);
      if (!Number.isNaN(parsed) && parsed <= receivedAt) {
        next.occurredAt = parsed;
      }
    }
  }
  if (location) {
    next.lat = location.lat;
    next.lng = location.lng;
    next.address = location.address;
    next.precise = location.precise;
  }
  // The public summary is required; fall back to the category label, which
  // never carries personal data.
  if (next.category && !next.summary) {
    next.summary = CATEGORIES[next.category].label;
  }
  // Report time defaults to the time of the message.
  next.occurredAt ??= receivedAt;
  return next;
}

export function isComplete(draft: Draft): draft is CompleteDraft {
  return (
    draft.category !== undefined &&
    draft.description !== undefined &&
    draft.summary !== undefined &&
    draft.address !== undefined &&
    draft.lat !== undefined &&
    draft.lng !== undefined &&
    draft.precise !== undefined &&
    draft.occurredAt !== undefined
  );
}

const reply = (
  state: ConversationState | null,
  ...out: OutgoingMessage[]
): Step => ({ type: "reply", state, messages: out });

export function nextStep(state: ConversationState | null, input: StepInput): Step {
  const { extraction, location, decision, receivedAt } = input;

  // Confirmation answers only count while a summary is on screen.
  if (state?.phase === "confirming" && isComplete(state.draft)) {
    if (decision === "yes") return { type: "register", draft: state.draft };
    if (decision === "no") {
      return reply(
        { phase: "collecting", draft: state.draft },
        messages.askCorrection(),
      );
    }
  }

  const previous = state?.draft ?? {};
  const isFirstMessage = state === null;

  if (extraction && extraction.kind !== "urban" && !location) {
    // A greeting or an off-topic first message gets the welcome, which
    // already explains what the bot does.
    return reply(
      state,
      isFirstMessage ? messages.askProblem() : messages.notUrban(),
    );
  }

  const draft = mergeDraft(previous, extraction, location, receivedAt);

  if (isComplete(draft)) {
    return reply({ phase: "confirming", draft }, messages.summary(draft));
  }

  const missingProblem = draft.description === undefined || !draft.category;
  const missingLocation = draft.lat === undefined;
  const next: ConversationState = { phase: "collecting", draft };

  if (missingProblem && missingLocation) {
    return reply(
      next,
      isFirstMessage ? messages.askProblem() : messages.askDescription(),
    );
  }
  if (missingProblem) return reply(next, messages.askDescription());
  return reply(next, messages.askLocation());
}
