import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";
import { modules } from "../test.setup";
import { claimPhoto } from "./photo";
import { mergeDraft, nextStep } from "./stateMachine";
import type { Extraction } from "./types";

const SESSION = "6f1c1a8e-3b7a-4c5e-9d1f-2a3b4c5d6e7f";
const NOW = Date.parse("2026-11-20T15:00:00-03:00");

const problem: Extraction = {
  kind: "urban",
  emergencyTarget: null,
  outOfScopeTarget: null,
  category: "street_lighting",
  description: "O poste da frente de casa está apagado",
  address: null,
  occurredAt: null,
  publicSummary: "Poste apagado.",
};
const pin = { lat: -23.558, lng: -51.45, address: "Rua Exemplo, 500", precise: true };
const jpeg = () => new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" });

async function setup() {
  const t = convexTest(schema, modules);
  await t.mutation(internal.seed.run, {});
  const citizenId = await t.mutation(internal.bot.conversations.ensureCitizen, {
    channel: "simulator",
    externalIdHash: "hash-1",
    sessionId: SESSION,
  });
  return { t, citizenId };
}
type T = Awaited<ReturnType<typeof setup>>["t"];

const store = (t: T) => t.run((ctx) => ctx.storage.store(jpeg()));
const exists = (t: T, id: Id<"_storage">) =>
  t.run(async (ctx) => (await ctx.db.system.get(id)) !== null);

async function step(
  t: T,
  citizenId: Id<"citizens">,
  input: {
    extraction?: Extraction | null;
    location?: typeof pin;
    decision?: "yes";
    photo?: Id<"_storage">;
  },
) {
  const { version } = await t.query(internal.bot.conversations.load, { citizenId });
  return t.mutation(internal.bot.conversations.applyStep, {
    citizenId,
    channel: "simulator",
    expectedVersion: version,
    receivedAt: NOW,
    extraction: input.extraction ?? null,
    location: input.location ?? null,
    decision: input.decision ?? null,
    photo: input.photo ? { storageId: input.photo } : undefined,
  });
}

function mockModal(route: () => Response) {
  const calls: RequestInit[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      calls.push(init);
      return route();
    }),
  );
  return calls;
}

beforeEach(() => {
  vi.stubEnv("MODAL_BLUR_URL", "https://blur.test/process");
  vi.stubEnv("MODAL_BLUR_SECRET", "blur-secret");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("state machine", () => {
  it("keeps a photo sent before the problem and says it got it", () => {
    const photo = { telegramFileId: "f1" };
    const step = nextStep(null, {
      receivedAt: NOW,
      extraction: null,
      location: null,
      decision: null,
      addressNotFound: false,
      reportsToday: 0,
      photo,
    });
    expect(step.type).toBe("reply");
    if (step.type !== "reply") return;
    expect(step.state?.draft.photo).toEqual(photo);
    expect(step.messages[0].text).toBe("📷 Recebi a foto.");
  });

  it("replaces the previous photo", () => {
    const draft = mergeDraft({ photo: { telegramFileId: "old" } }, null, null, NOW, {
      telegramFileId: "new",
    });
    expect(draft.photo).toEqual({ telegramFileId: "new" });
  });
});

describe("photo in the conversation", () => {
  it("deletes a replaced upload and sends the kept one to anonymization on SIM", async () => {
    const { t, citizenId } = await setup();
    const first = await store(t);
    const second = await store(t);

    await step(t, citizenId, { extraction: problem, photo: first });
    const replaced = await step(t, citizenId, { photo: second });
    expect(replaced.ok && replaced.messages[0].text).toBe("📷 Foto atualizada.");
    expect(await exists(t, first)).toBe(false);

    const summary = await step(t, citizenId, { location: pin });
    expect(summary.ok && summary.messages.at(-1)?.text).toContain("📷 Foto anexada");

    const done = await step(t, citizenId, { decision: "yes" });
    expect(done.ok && done.messages[0].text).toContain("sendo anonimizada");
    const occurrence = await t.run(async (ctx) =>
      (await ctx.db.query("occurrences").collect()).find((o) => o.source === "simulator"),
    );
    expect(occurrence?.photo).toEqual({ status: "processing" });
    // The original waits for the worker.
    expect(await exists(t, second)).toBe(true);
  });

  it("deletes the upload of an expired conversation", async () => {
    const { t, citizenId } = await setup();
    const photo = await store(t);
    await step(t, citizenId, { extraction: problem, photo });
    await t.run((ctx) =>
      ctx.db
        .query("conversations")
        .first()
        .then((c) => ctx.db.patch(c!._id, { updatedAt: 0 })),
    );
    await t.mutation(internal.bot.conversations.expire, {});
    expect(await exists(t, photo)).toBe(false);
  });

  it("drops the photo when the occurrence already has one", async () => {
    const { t, citizenId } = await setup();
    const photo = await store(t);
    const published = await store(t);
    const claimed = await t.run(async (ctx) => {
      const occurrence = (await ctx.db.query("occurrences").first())!;
      await ctx.db.patch(occurrence._id, {
        photo: { status: "ready", storageId: published },
      });
      return claimPhoto(
        ctx,
        { kind: "appealed", occurrenceId: occurrence._id, appeal: 2 },
        { storageId: photo },
        citizenId,
      );
    });
    expect(claimed).toBe(false);
    expect(await exists(t, photo)).toBe(false);
    expect(await exists(t, published)).toBe(true);
  });
});

describe("anonymize", () => {
  async function processing(t: T) {
    return t.run(async (ctx) => {
      const occurrence = (await ctx.db.query("occurrences").first())!;
      await ctx.db.patch(occurrence._id, { photo: { status: "processing" } });
      return occurrence._id;
    });
  }

  it("publishes the blurred copy and deletes the original", async () => {
    const { t, citizenId } = await setup();
    const original = await store(t);
    const blurred = await store(t);
    const occurrenceId = await processing(t);
    const calls = mockModal(() => Response.json({ ok: true, storageId: blurred }));

    await t.action(internal.bot.photo.anonymize, {
      occurrenceId,
      citizenId,
      photo: { storageId: original },
    });

    expect(new Headers(calls[0].headers).get("authorization")).toBe("Bearer blur-secret");
    const body = JSON.parse(String(calls[0].body));
    expect(body).toHaveProperty("image_url");
    expect(body).toHaveProperty("upload_url");
    const occurrence = await t.run((ctx) => ctx.db.get(occurrenceId));
    expect(occurrence?.photo).toEqual({ status: "ready", storageId: blurred });
    expect(await exists(t, original)).toBe(false);
    const bot = await t.run((ctx) => ctx.db.query("simulatorMessages").collect());
    expect(bot.at(-1)?.text).toContain("Foto publicada");
  });

  it("retries once, then clears the photo and tells the citizen", async () => {
    const { t, citizenId } = await setup();
    const original = await store(t);
    const occurrenceId = await processing(t);
    const calls = mockModal(() => new Response("boom", { status: 500 }));

    await t.action(internal.bot.photo.anonymize, {
      occurrenceId,
      citizenId,
      photo: { storageId: original },
    });

    expect(calls).toHaveLength(2);
    const occurrence = await t.run((ctx) => ctx.db.get(occurrenceId));
    expect(occurrence?.photo).toBeUndefined();
    expect(await exists(t, original)).toBe(false);
    const bot = await t.run((ctx) => ctx.db.query("simulatorMessages").collect());
    expect(bot.at(-1)?.text).toContain("Não consegui publicar a foto");
  });
});
