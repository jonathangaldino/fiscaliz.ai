import { describe, expect, it } from "vitest";
import { nextStep, parseDecision } from "./stateMachine";
import type {
  CompleteDraft,
  ConversationState,
  Extraction,
  ResolvedLocation,
  StepInput,
} from "./types";

const NOW = Date.parse("2026-11-20T15:00:00-03:00");

const urban = (overrides: Partial<Extraction> = {}): Extraction => ({
  kind: "urban",
  emergencyTarget: null,
  outOfScopeTarget: null,
  category: "pavement",
  description: "Buraco enorme na rua",
  address: null,
  occurredAt: null,
  publicSummary: "Buraco grande no asfalto.",
  ...overrides,
});

const empty = (overrides: Partial<Extraction> = {}): Extraction => ({
  kind: "urban",
  emergencyTarget: null,
  outOfScopeTarget: null,
  category: null,
  description: null,
  address: null,
  occurredAt: null,
  publicSummary: null,
  ...overrides,
});

const pin: ResolvedLocation = {
  lat: -23.5512,
  lng: -51.4625,
  address: "Avenida Curitiba, 100",
  precise: true,
};

const input = (overrides: Partial<StepInput> = {}): StepInput => ({
  receivedAt: NOW,
  extraction: null,
  location: null,
  decision: null,
  ...overrides,
});

const complete: CompleteDraft = {
  category: "pavement",
  description: "Buraco enorme na rua",
  summary: "Buraco grande no asfalto.",
  address: pin.address,
  lat: pin.lat,
  lng: pin.lng,
  precise: true,
  occurredAt: NOW,
};

const confirming: ConversationState = { phase: "confirming", draft: complete };

describe("parseDecision", () => {
  it.each([
    ["sim", "yes"],
    ["Sim!", "yes"],
    ["SIM.", "yes"],
    ["não", "no"],
    ["NAO", "no"],
    ["tem um buraco", null],
    ["", null],
  ] as const)("reads %j as %s", (text, expected) => {
    expect(parseDecision(text, undefined)).toBe(expected);
  });

  it("prefers the button", () => {
    expect(parseDecision("não", "yes")).toBe("yes");
  });
});

describe("nextStep: collecting", () => {
  it("welcomes a citizen whose first message has no problem", () => {
    const step = nextStep(null, input({ extraction: empty({ kind: "invalid" }) }));
    expect(step).toMatchObject({ type: "reply", state: null });
    if (step.type === "reply") expect(step.messages[0].text).toMatch(/Olá/);
  });

  it("asks for the location when only the problem is known", () => {
    const step = nextStep(null, input({ extraction: urban() }));
    expect(step).toMatchObject({
      type: "reply",
      state: { phase: "collecting", draft: { category: "pavement" } },
    });
    if (step.type === "reply") expect(step.messages[0].text).toMatch(/Onde fica/);
  });

  it("asks for the problem when only the location is known", () => {
    const step = nextStep(
      { phase: "collecting", draft: {} },
      input({ location: pin }),
    );
    expect(step).toMatchObject({
      type: "reply",
      state: { phase: "collecting", draft: { lat: pin.lat } },
    });
    if (step.type === "reply") {
      expect(step.messages[0].text).toMatch(/Qual é o problema/);
    }
  });

  it("shows the summary with SIM/NÃO once problem and location are known", () => {
    const step = nextStep(
      { phase: "collecting", draft: { lat: pin.lat, lng: pin.lng, address: pin.address, precise: true } },
      input({ extraction: urban() }),
    );
    expect(step).toMatchObject({ type: "reply", state: { phase: "confirming" } });
    if (step.type === "reply") {
      expect(step.messages[0].text).toMatch(/Confere o relato/);
      expect(step.messages[0].buttons?.map((b) => b.id)).toEqual(["yes", "no"]);
    }
  });

  it("goes straight to the summary when one message brings everything", () => {
    const step = nextStep(null, input({ extraction: urban(), location: pin }));
    expect(step).toMatchObject({ type: "reply", state: { phase: "confirming" } });
  });

  it("defaults the report time to the message time", () => {
    const step = nextStep(null, input({ extraction: urban() }));
    if (step.type !== "reply") throw new Error("expected reply");
    expect(step.state?.draft.occurredAt).toBe(NOW);
  });

  it("uses the time the citizen gave", () => {
    const step = nextStep(
      null,
      input({ extraction: urban({ occurredAt: "2026-11-19T08:00:00-03:00" }) }),
    );
    if (step.type !== "reply") throw new Error("expected reply");
    expect(step.state?.draft.occurredAt).toBe(
      Date.parse("2026-11-19T08:00:00-03:00"),
    );
  });

  it("ignores a time in the future", () => {
    const step = nextStep(
      null,
      input({ extraction: urban({ occurredAt: "2027-01-01T00:00:00-03:00" }) }),
    );
    if (step.type !== "reply") throw new Error("expected reply");
    expect(step.state?.draft.occurredAt).toBe(NOW);
  });

  it("falls back to the category label when the AI gives no summary", () => {
    const step = nextStep(null, input({ extraction: urban({ publicSummary: null }) }));
    if (step.type !== "reply") throw new Error("expected reply");
    expect(step.state?.draft.summary).toBe("Buracos / pavimento");
  });

  it("refuses off-topic messages mid-conversation and keeps the draft", () => {
    const state: ConversationState = { phase: "collecting", draft: { category: "pavement" } };
    const step = nextStep(state, input({ extraction: empty({ kind: "invalid" }) }));
    expect(step).toMatchObject({ type: "reply", state });
    if (step.type === "reply") expect(step.messages[0].text).toMatch(/só consigo/);
  });
});

describe("nextStep: confirming", () => {
  it("registers on SIM", () => {
    const step = nextStep(confirming, input({ decision: "yes" }));
    expect(step).toEqual({ type: "register", draft: complete });
  });

  it("goes back to collecting on NÃO and asks what to fix", () => {
    const step = nextStep(confirming, input({ decision: "no" }));
    expect(step).toMatchObject({
      type: "reply",
      state: { phase: "collecting", draft: complete },
    });
    if (step.type === "reply") expect(step.messages[0].text).toMatch(/corrigido/);
  });

  it("treats other text as a correction and shows the summary again", () => {
    const step = nextStep(
      confirming,
      input({ extraction: urban({ category: "drainage", publicSummary: "Bueiro entupido." }) }),
    );
    expect(step).toMatchObject({
      type: "reply",
      state: { phase: "confirming", draft: { category: "drainage", summary: "Bueiro entupido." } },
    });
  });

  it("ignores SIM when nothing is waiting for confirmation", () => {
    const step = nextStep({ phase: "collecting", draft: {} }, input({ decision: "yes" }));
    expect(step.type).toBe("reply");
  });
});
