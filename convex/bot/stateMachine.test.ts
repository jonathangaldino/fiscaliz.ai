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
  reportsToday: 0,
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

describe("nextStep: priority rules", () => {
  const emergency = empty({ kind: "emergency", emergencyTarget: "firefighters" });
  const sanepar = empty({ kind: "out_of_scope", outOfScopeTarget: "sanepar" });

  it.each([
    ["no conversation", null],
    ["collecting", { phase: "collecting", draft: { category: "pavement" } }],
    ["confirming", confirming],
  ] as const)("redirects an emergency while %s and ends the conversation", (_, state) => {
    const step = nextStep(state as ConversationState | null, input({ extraction: emergency }));
    expect(step).toMatchObject({
      type: "reply",
      state: null,
      counter: { kind: "emergency", target: "firefighters" },
    });
    if (step.type === "reply") expect(step.messages[0].text).toMatch(/193/);
  });

  it("checks emergency before a pending confirmation", () => {
    const step = nextStep(confirming, input({ extraction: emergency, decision: "yes" }));
    expect(step.type).toBe("reply");
  });

  it("checks emergency even when a location comes along", () => {
    const step = nextStep(null, input({ extraction: emergency, location: pin }));
    expect(step).toMatchObject({ state: null, counter: { kind: "emergency" } });
  });

  it.each([
    ["police", "190"],
    ["samu", "192"],
    ["firefighters", "193"],
    ["civil_defense", "199"],
  ] as const)("sends %s to %s", (target, number) => {
    const step = nextStep(
      null,
      input({ extraction: empty({ kind: "emergency", emergencyTarget: target }) }),
    );
    if (step.type !== "reply") throw new Error("expected reply");
    expect(step.messages[0].text).toContain(`: ${number}*`);
  });

  it("lists every emergency number when the target is unknown", () => {
    const step = nextStep(null, input({ extraction: empty({ kind: "emergency" }) }));
    if (step.type !== "reply") throw new Error("expected reply");
    expect(step.counter).toEqual({ kind: "emergency", target: "unknown" });
    for (const number of ["190", "192", "193", "199"]) {
      expect(step.messages[0].text).toContain(number);
    }
  });

  it("points water problems to Sanepar and ends the conversation", () => {
    const step = nextStep(
      { phase: "collecting", draft: {} },
      input({ extraction: sanepar }),
    );
    expect(step).toMatchObject({
      state: null,
      counter: { kind: "out_of_scope", target: "sanepar" },
    });
    if (step.type === "reply") expect(step.messages[0].text).toMatch(/0800 200 0115/);
  });

  it("points power grid problems to Copel", () => {
    const step = nextStep(
      null,
      input({ extraction: empty({ kind: "out_of_scope", outOfScopeTarget: "copel" }) }),
    );
    if (step.type !== "reply") throw new Error("expected reply");
    expect(step.messages[0].text).toMatch(/Copel: 0800 51 00 116/);
  });

  it("keeps street lighting as an urban problem routed to Idepplan", () => {
    const step = nextStep(
      null,
      input({ extraction: urban({ category: "street_lighting" }), location: pin }),
    );
    expect(step).toMatchObject({ state: { phase: "confirming" } });
    expect(step.type === "reply" && step.counter).toBeFalsy();
  });
});

describe("nextStep: daily limit", () => {
  it("lets the 5th report through", () => {
    const step = nextStep(confirming, input({ decision: "yes", reportsToday: 4 }));
    expect(step.type).toBe("register");
  });

  it("refuses once 5 reports were confirmed today", () => {
    const step = nextStep(confirming, input({ decision: "yes", reportsToday: 5 }));
    expect(step).toMatchObject({ type: "reply", state: null });
    if (step.type === "reply") expect(step.messages[0].text).toMatch(/limite diário/);
  });

  it("still redirects emergencies after the limit", () => {
    const step = nextStep(
      null,
      input({
        extraction: empty({ kind: "emergency", emergencyTarget: "samu" }),
        reportsToday: 5,
      }),
    );
    expect(step).toMatchObject({ counter: { kind: "emergency" } });
  });
});
