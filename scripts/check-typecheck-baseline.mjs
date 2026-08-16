#!/usr/bin/env node
/**
 * check-typecheck-baseline
 * --------------------------------------------------------------
 * Trava anti-regressão de tipagem enquanto a dívida de `strict` +
 * `noUncheckedIndexedAccess` é zerada arquivo a arquivo.
 *
 * Como funciona:
 *   - Roda o typecheck completo (`tsgo --noEmit -p tsconfig.app.json`,
 *     com fallback para `tsc`) e conta erros por arquivo.
 *   - Compara com `.typecheck-baseline.json`.
 *   - FALHA se: (a) algum arquivo passou a ter MAIS erros que o baseline,
 *     ou (b) um arquivo novo (fora do baseline) introduziu erros.
 *   - Arquivos que melhoraram apenas geram aviso pedindo o update do
 *     baseline (`--update`), garantindo que a dívida só ande para baixo.
 *
 * Uso:
 *   node scripts/check-typecheck-baseline.mjs            # verifica
 *   node scripts/check-typecheck-baseline.mjs --update   # regrava baseline
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const BASELINE_PATH = ".typecheck-baseline.json";
const UPDATE = process.argv.includes("--update");

function runTypecheck() {
  for (const bin of ["tsgo", "tsc"]) {
    const res = spawnSync("npx", [bin, "--noEmit", "-p", "tsconfig.app.json"], {
      encoding: "utf8",
      maxBuffer: 128 * 1024 * 1024,
    });
    if (res.error) continue;
    return `${res.stdout ?? ""}${res.stderr ?? ""}`;
  }
  console.error("Não foi possível executar tsgo/tsc.");
  process.exit(2);
}

const out = runTypecheck();
const counts = {};
for (const line of out.split("\n")) {
  const m = line.match(/^([^\s(]+\.(?:ts|tsx))\(\d+,\d+\):\s+error TS\d+/);
  if (!m) continue;
  counts[m[1]] = (counts[m[1]] ?? 0) + 1;
}
const total = Object.values(counts).reduce((a, b) => a + b, 0);

if (UPDATE) {
  const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(
    BASELINE_PATH,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), total, files: sorted }, null, 2)}\n`,
  );
  console.log(`✅ Baseline gravado: ${total} erro(s) em ${Object.keys(sorted).length} arquivo(s).`);
  process.exit(0);
}

if (!existsSync(BASELINE_PATH)) {
  console.error(`❌ ${BASELINE_PATH} ausente. Rode: node scripts/check-typecheck-baseline.mjs --update`);
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
const base = baseline.files ?? {};
const regressions = [];
const improvements = [];

for (const [file, n] of Object.entries(counts)) {
  const allowed = base[file] ?? 0;
  if (n > allowed) regressions.push(`${file}: ${n} erro(s) (baseline ${allowed})`);
}
for (const [file, allowed] of Object.entries(base)) {
  const n = counts[file] ?? 0;
  if (n < allowed) improvements.push(`${file}: ${n} (baseline ${allowed})`);
}

console.log(`\n🧮 Typecheck baseline gate`);
console.log(`   Total atual:   ${total}`);
console.log(`   Total baseline: ${baseline.total ?? "?"}`);

if (improvements.length) {
  console.log(`\n📉 ${improvements.length} arquivo(s) melhoraram — rode --update para travar o ganho.`);
}

if (regressions.length) {
  console.error(`\n❌ ${regressions.length} regressão(ões) de tipagem:\n`);
  for (const r of regressions) console.error(`   ${r}`);
  if (process.env.GITHUB_ACTIONS === "true") {
    console.log(`::error title=Typecheck baseline gate failed::${regressions.length} arquivo(s) com mais erros que o baseline.`);
  }
  process.exit(1);
}

console.log(`\n✅ Sem regressões de tipagem.`);
process.exit(0);
