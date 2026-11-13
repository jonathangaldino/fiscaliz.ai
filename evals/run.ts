/**
 * Triage eval: runs the fixtures against the real Claude API and reports
 * accuracy by kind and by category. Costs money, so it is not part of CI.
 *
 *   ANTHROPIC_API_KEY=... npm run eval
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extract, MODEL } from "../convex/bot/extract";
import type { Extraction } from "../convex/bot/types";

type Fixture = {
  text: string;
  kind: Extraction["kind"];
  category?: string;
  emergencyTarget?: string;
  outOfScopeTarget?: string;
};

type Tally = Record<string, { total: number; correct: number }>;

const fixtures: Fixture[] = readFileSync(join(import.meta.dirname, "fixtures.jsonl"), "utf8")
  .split("\n")
  .filter((line) => line.trim())
  .map((line) => JSON.parse(line));

function count(tally: Tally, key: string, ok: boolean) {
  tally[key] ??= { total: 0, correct: 0 };
  tally[key].total++;
  if (ok) tally[key].correct++;
}

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

  const byKind: Tally = {};
  const byCategory: Tally = {};
  const errors: string[] = [];
  let emergencyAsUrban = 0;
  const receivedAt = Date.parse("2026-11-20T15:00:00-03:00");

  for (const fixture of fixtures) {
    let result: Extraction;
    try {
      result = await extract({ draft: {}, text: fixture.text, receivedAt });
    } catch (error) {
      errors.push(`ERRO  "${fixture.text}": ${(error as Error).message}`);
      count(byKind, fixture.kind, false);
      continue;
    }

    const kindOk = result.kind === fixture.kind;
    count(byKind, fixture.kind, kindOk);
    if (!kindOk) {
      errors.push(`kind  "${fixture.text}": esperado ${fixture.kind}, veio ${result.kind}`);
      if (fixture.kind === "emergency" && result.kind === "urban") emergencyAsUrban++;
    }

    if (fixture.category) {
      const ok = result.category === fixture.category;
      count(byCategory, fixture.category, ok);
      if (!ok) {
        errors.push(
          `cat   "${fixture.text}": esperado ${fixture.category}, veio ${result.category}`,
        );
      }
    }
    for (const field of ["emergencyTarget", "outOfScopeTarget"] as const) {
      if (fixture[field] && result[field] !== fixture[field]) {
        errors.push(
          `${field} "${fixture.text}": esperado ${fixture[field]}, veio ${result[field]}`,
        );
      }
    }
  }

  print("Acerto por tipo", byKind);
  print("Acerto por categoria", byCategory);
  console.log(errors.length ? `\nErros:\n  ${errors.join("\n  ")}` : "\nSem erros.");

  if (emergencyAsUrban > 0) {
    console.log(
      `\n⚠️  ${emergencyAsUrban} emergência(s) classificada(s) como urbano. Avaliar troca de modelo.`,
    );
    process.exit(2);
  }
}

main();
