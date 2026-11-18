import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { modules } from "./test.setup";
import { hashCitizenId } from "./lib/citizenHash";
import {
  REVERIFY_LOCK_MS,
  VERIFICATION_TIMEOUT_MS,
  verifyButtonId,
} from "./lib/verification";

const SESSIONS = [
  "6f1c1a8e-3b7a-4c5e-9d1f-2a3b4c5d6e70",
  "6f1c1a8e-3b7a-4c5e-9d1f-2a3b4c5d6e71",
  "6f1c1a8e-3b7a-4c5e-9d1f-2a3b4c5d6e72",
];

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(Date.parse("2026-11-20T15:00:00-03:00"));
  vi.stubEnv("CITIZEN_HASH_SECRET", "test-secret");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

/** An occurrence with one simulator citizen per session, each with a report. */
async function setup(reporters = 1, appeal = reporters) {
  const t = convexTest(schema, modules);
  const hashes = await Promise.all(
    SESSIONS.map((session) => hashCitizenId("simulator", session)),
  );
  const ids = await t.run(async (ctx) => {
    const occurrenceId = await ctx.db.insert("occurrences", {
      category: "pavement",
      status: "open",
      lat: -23.55,
      lng: -51.46,
      address: "Rua Exemplo, 10",
      summary: "Buraco no asfalto.",
      appeal,
      openedAt: Date.now(),
      source: "simulator",
    });
    const citizenIds: Id<"citizens">[] = [];
    for (const [index, sessionId] of SESSIONS.slice(0, reporters).entries()) {
      const citizenId = await ctx.db.insert("citizens", {
        channel: "simulator",
        externalIdHash: hashes[index],
        sessionId,
      });
      citizenIds.push(citizenId);
      await ctx.db.insert("reports", {
        occurrenceId,
        citizenId,
        description: "buraco",
        occurredAt: Date.now(),
        createdAt: Date.now(),
      });
    }
    return { occurrenceId, citizenIds };
  });
  return { t, ...ids };
}

type T = Awaited<ReturnType<typeof setup>>["t"];

const status = (t: T, id: Id<"occurrences">) =>
  t.run(async (ctx) => (await ctx.db.get(id))!);

async function startAndNotify(t: T, id: Id<"occurrences">) {
  await t.mutation(api.verification.start, { id });
  vi.advanceTimersByTime(1);
  await t.finishInProgressScheduledFunctions();
}

describe("verification", () => {
  it("asks every reporter in the simulator, with answer buttons", async () => {
    const { t, occurrenceId } = await setup(2);
    await startAndNotify(t, occurrenceId);

    expect((await status(t, occurrenceId)).status).toBe("verifying");
    const chat = await t.query(api.simulator.messages, { sessionId: SESSIONS[1] });
    expect(chat).toHaveLength(1);
    expect(chat[0].text).toContain("Esse problema já foi resolvido?");
    expect(chat[0].buttons?.map((b) => b.id)).toEqual([
      verifyButtonId(occurrenceId, "yes"),
      verifyButtonId(occurrenceId, "no"),
    ]);
  });

  it("resolves when YES reaches 30% of the appeal", async () => {
    const { t, occurrenceId, citizenIds } = await setup(1, 3);
    await startAndNotify(t, occurrenceId);

    const reply = await t.mutation(internal.verification.vote, {
      citizenId: citizenIds[0],
      occurrenceId,
      answer: "yes",
    });
    expect(reply.text).toContain("resolvida");
    const occurrence = await status(t, occurrenceId);
    expect(occurrence.status).toBe("resolved");
    expect(occurrence.resolvedAt).toBeDefined();
    expect((await t.query(api.occurrences.listResolved, {})).map((o) => o._id)).toEqual([
      occurrenceId,
    ]);
    expect(await t.query(api.occurrences.listActive, {})).toHaveLength(0);
  });

  it("waits while YES is below 30%", async () => {
    const { t, occurrenceId, citizenIds } = await setup(1, 10);
    await startAndNotify(t, occurrenceId);
    const reply = await t.mutation(internal.verification.vote, {
      citizenId: citizenIds[0],
      occurrenceId,
      answer: "yes",
    });
    expect(reply.text).toContain("registrada");
    expect((await status(t, occurrenceId)).status).toBe("verifying");
    // Still on the map while verifying.
    expect(await t.query(api.occurrences.listActive, {})).toHaveLength(1);
  });

  it("reopens on NO > YES and locks a new verification for 7 days", async () => {
    const { t, occurrenceId, citizenIds } = await setup(1);
    await startAndNotify(t, occurrenceId);
    await t.mutation(internal.verification.vote, {
      citizenId: citizenIds[0],
      occurrenceId,
      answer: "no",
    });

    const occurrence = await status(t, occurrenceId);
    expect(occurrence.status).toBe("open");
    expect(occurrence.reopenedAt).toBeDefined();
    expect(await t.query(api.verification.availability, { id: occurrenceId })).toEqual({
      canStart: false,
      availableAt: occurrence.reopenedAt! + REVERIFY_LOCK_MS,
    });
    await expect(t.mutation(api.verification.start, { id: occurrenceId })).rejects.toThrow(
      "7 dias",
    );
    // Votes are cleared for the next round.
    expect(await t.run((ctx) => ctx.db.query("verificationVotes").collect())).toHaveLength(0);

    vi.setSystemTime(occurrence.reopenedAt! + REVERIFY_LOCK_MS);
    await t.mutation(api.verification.start, { id: occurrenceId });
    expect((await status(t, occurrenceId)).status).toBe("verifying");
  });

  it("reopens after 48 h without enough YES", async () => {
    const { t, occurrenceId } = await setup(1, 10);
    await startAndNotify(t, occurrenceId);

    vi.advanceTimersByTime(VERIFICATION_TIMEOUT_MS);
    await t.finishInProgressScheduledFunctions();

    const occurrence = await status(t, occurrenceId);
    expect(occurrence.status).toBe("open");
    expect(occurrence.reopenedAt).toBeDefined();
  });

  it("ignores answers from citizens without a report, or after the round", async () => {
    const { t, occurrenceId } = await setup(1);
    const stranger = await t.mutation(internal.bot.conversations.ensureCitizen, {
      channel: "simulator",
      externalIdHash: "stranger",
      sessionId: SESSIONS[2],
    });

    let reply = await t.mutation(internal.verification.vote, {
      citizenId: stranger,
      occurrenceId,
      answer: "yes",
    });
    expect(reply.text).toContain("já terminou");

    await startAndNotify(t, occurrenceId);
    reply = await t.mutation(internal.verification.vote, {
      citizenId: stranger,
      occurrenceId,
      answer: "no",
    });
    expect(reply.text).toContain("já terminou");
    expect((await status(t, occurrenceId)).status).toBe("verifying");
  });

  it("hides the button on occurrences nobody can be asked about", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.seed.run, {});
    const [seed] = await t.query(api.occurrences.listActive, {});
    expect(await t.query(api.verification.availability, { id: seed._id })).toBeNull();
    await expect(t.mutation(api.verification.start, { id: seed._id })).rejects.toThrow();
  });

  it("skips WhatsApp reporters unless VERIFICATION_WHATSAPP_ENABLED is true", async () => {
    const { t, occurrenceId, citizenIds } = await setup();
    await t.run((ctx) =>
      ctx.db.patch(citizenIds[0], { channel: "whatsapp", sessionId: undefined, phone: "5543999990000" }),
    );
    expect(await t.query(api.verification.availability, { id: occurrenceId })).toBeNull();
    vi.stubEnv("VERIFICATION_WHATSAPP_ENABLED", "true");
    expect(await t.query(api.verification.availability, { id: occurrenceId })).not.toBeNull();
  });

  it("routes a simulator verification button to the vote", async () => {
    const { t, occurrenceId } = await setup(1);
    await startAndNotify(t, occurrenceId);
    await t.mutation(api.simulator.send, {
      sessionId: SESSIONS[0],
      button: verifyButtonId(occurrenceId, "yes"),
    });
    vi.advanceTimersByTime(1);
    await t.finishInProgressScheduledFunctions();

    expect((await status(t, occurrenceId)).status).toBe("resolved");
    const chat = await t.query(api.simulator.messages, { sessionId: SESSIONS[0] });
    expect(chat.map((m) => m.text)).toContain("SIM, resolvido");
  });
});
