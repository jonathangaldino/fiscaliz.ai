/**
 * Triage eval: runs the fixtures against the real Claude API and reports
 * accuracy by kind and by category. Costs money, so it is not part of CI.
 *
 *   ANTHROPIC_API_KEY=... npm run eval
 *
 * Exits with 2 when any emergency fixture is not classified as emergency.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extract, MODEL } from "../convex/bot/extract";
import type { Extraction } from "../convex/bot/types";
import { newReport, score, type Fixture, type Tally } from "./score";

const fixtures: Fixture[] = readFileSync(join(import.meta.dirname, "fixtures.jsonl"), "utf8")
  .split("\n")
  .filter((line) => line.trim())
  .map((line) => JSON.parse(line));

function print(title: string, tally: Tally) {
  console.log(`\n${title}`);
  for (const [key, { total, correct }] of Object.entries(tally)) {
    const pct = ((correct / total) * 100).toFixed(0).padStart(3);
    console.log(`  ${key.padEnd(18)} ${correct}/${total}  ${pct}%`);
  }
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Set ANTHROPIC_API_KEY to run the eval.");
    process.exit(1);
  }
  console.log(`Model: ${MODEL} · ${fixtures.length} fixtures`);

  const report = newReport();
  const receivedAt = Date.parse("2026-11-20T15:00:00-03:00");

  for (const fixture of fixtures) {
    let outcome: Extraction | Error;
    try {
      outcome = await extract({ draft: {}, text: fixture.text, receivedAt });
    } catch (error) {
      outcome = error as Error;
    }
    score(report, fixture, outcome);
  }

  print("Acerto por tipo", report.byKind);
  print("Acerto por categoria", report.byCategory);
  console.log(report.errors.length ? `\nErros:\n  ${report.errors.join("\n  ")}` : "\nSem erros.");

  const missed = Object.entries(report.missedEmergencies);
  if (missed.length > 0) {
    const total = missed.reduce((sum, [, n]) => sum + n, 0);
    const detail = missed.map(([kind, n]) => `${kind}: ${n}`).join(", ");
    console.log(
      `\n⚠️  ${total} emergência(s) não classificada(s) como emergência (${detail}). Avaliar troca de modelo.`,
    );
    process.exit(2);
  }
}

main();
