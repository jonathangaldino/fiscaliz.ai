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

/**
 * Rules checked before any transition, in any state, in this order:
 * 1. emergency  → redirect to 190/192/193/199, end the conversation
 * 2. out_of_scope → point to Sanepar/Copel, end the conversation
 *    Neither becomes a report; only an anonymous counter is stored.
 * 3. invalid → polite refusal (handled in nextStep, keeps the draft)
 * 4. daily limit reached → refuse, end the conversation
 */
export const DAILY_REPORT_LIMIT = 5;

function priorityRules(
  extraction: Extraction | null,
  reportsToday: number,
): Step | null {
  if (extraction?.kind === "emergency") {
    return {
      type: "reply",
      state: null,
      messages: [messages.emergency(extraction.emergencyTarget)],
      counter: {
        kind: "emergency",
        target: extraction.emergencyTarget ?? "unknown",
      },
    };
  }
  if (extraction?.kind === "out_of_scope") {
    return {
      type: "reply",
      state: null,
      messages: [messages.outOfScope(extraction.outOfScopeTarget)],
      counter: {
        kind: "out_of_scope",
        target: extraction.outOfScopeTarget ?? "unknown",
      },
    };
  }
  if (reportsToday >= DAILY_REPORT_LIMIT) {
    return {
      type: "reply",
      state: null,
      messages: [messages.dailyLimit(DAILY_REPORT_LIMIT)],
    };
  }
  return null;
}

export function nextStep(state: ConversationState | null, input: StepInput): Step {
  const { extraction, location, decision, receivedAt, reportsToday } = input;

  const priority = priorityRules(extraction, reportsToday);
  if (priority) return priority;

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
