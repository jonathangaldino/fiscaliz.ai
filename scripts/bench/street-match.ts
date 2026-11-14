/** Prints the ADR 0007 benchmark as Markdown. Usage: npx tsx scripts/bench/street-match.ts */
import { dataset, quantile, run, VARIANTS } from "./streetMatch";

const cases = dataset();
const results = Object.fromEntries(
  Object.entries(VARIANTS).map(([name, distance]) => [name, run(cases, distance)]),
);
const groups = Object.keys(results.exato.groups);
const ms = (n: number) => n.toFixed(2);

console.log(`${cases.length} endereços, ${groups.length} grupos\n`);
console.log(`| Grupo | ${Object.keys(results).join(" | ")} |`);
console.log(`|---|${Object.keys(results).map(() => "---").join("|")}|`);
for (const group of groups) {
  const cells = Object.values(results).map(({ groups: g }) => {
    const r = g[group];
    return `${r.certo} certo, ${r.errado} errado, ${r.nada} nada`;
  });
  console.log(`| ${group} | ${cells.join(" | ")} |`);
}

console.log(`\n| Variante | p50 | p95 | máx (ms) |\n|---|---|---|---|`);
for (const [name, { groups: g }] of Object.entries(results)) {
  const times = Object.values(g).flatMap((r) => r.times);
  console.log(`| ${name} | ${ms(quantile(times, 0.5))} | ${ms(quantile(times, 0.95))} | ${ms(Math.max(...times))} |`);
}

for (const [name, { wrong }] of Object.entries(results)) {
  if (wrong.length) console.log(`\n${name}, rua errada:\n${wrong.map((w) => `- ${w}`).join("\n")}`);
}
