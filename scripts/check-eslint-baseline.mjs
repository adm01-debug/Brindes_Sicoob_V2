#!/usr/bin/env node
/**
 * Gate de regressão do ESLint.
 *
 * A referência preferencial é o código real da branch-base. Isso evita que um
 * baseline histórico desatualizado atribua a esta PR problemas já presentes em
 * arquivos que ela não alterou. Para cada arquivo de src modificado, o gate
 * compara a contagem por regra antes/depois usando a mesma versão do ESLint.
 *
 * Quando a branch-base não está disponível, o gate volta ao snapshot
 * `.eslint-baseline.json`. O fallback preserva execução em pacotes sem histórico
 * Git completo, mas a CI deve usar checkout com `fetch-depth: 0`.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { ESLint } from "eslint";

const ROOT = process.cwd();
const BASELINE_PATH = join(ROOT, ".eslint-baseline.json");
const MAX_LIST = 50;
const SOURCE_FILE_RE = /^src\/.*\.(?:js|jsx|ts|tsx)$/;

function runGit(args) {
  return spawnSync("git", args, { cwd: ROOT, encoding: "utf8", shell: false });
}

function verifiedRef(candidate) {
  if (!candidate) return null;
  const result = runGit(["rev-parse", "--verify", candidate]);
  return result.status === 0 ? result.stdout.trim() : null;
}

function changedSourceFiles(baseSha) {
  const result = runGit(["diff", "--name-only", "--diff-filter=ACMR", baseSha, "--", "src"]);
  if (result.status !== 0) return [];
  return result.stdout
    .split(/\r?\n/)
    .map((file) => file.trim())
    .filter((file) => SOURCE_FILE_RE.test(file) && existsSync(join(ROOT, file)));
}

function resolveBaseCommit() {
  const candidates = [
    process.env.ESLINT_BASE_REF,
    process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : null,
    "origin/main",
  ];
  const head = verifiedRef("HEAD");

  for (const candidate of candidates) {
    const target = verifiedRef(candidate);
    if (!target) continue;
    const mergeBase = runGit(["merge-base", "HEAD", target]);
    if (mergeBase.status !== 0) continue;
    const base = mergeBase.stdout.trim();
    if (base !== head || changedSourceFiles(base).length > 0) return { sha: base, label: candidate };
  }

  const parent = verifiedRef("HEAD^");
  return parent ? { sha: parent, label: "HEAD^" } : null;
}

function aggregate(report) {
  const counts = {};
  const messages = new Map();
  let totalErrors = 0;

  for (const file of report) {
    const rel = relative(ROOT, file.filePath).replaceAll("\\", "/");
    for (const message of file.messages ?? []) {
      if (message.severity !== 2) continue;
      const rule = message.ruleId ?? "<no-rule>";
      counts[rel] ??= {};
      counts[rel][rule] = (counts[rel][rule] ?? 0) + 1;
      totalErrors += 1;

      const key = `${rel}::${rule}`;
      const examples = messages.get(key) ?? [];
      if (examples.length < 3) examples.push(`${message.line}:${message.column} ${message.message}`);
      messages.set(key, examples);
    }
  }

  return { counts, messages, totalErrors };
}

function compareCounts(currentCounts, baseCounts) {
  const regressions = [];
  const improvements = [];
  const files = new Set([...Object.keys(currentCounts), ...Object.keys(baseCounts)]);

  for (const file of files) {
    const rules = new Set([
      ...Object.keys(currentCounts[file] ?? {}),
      ...Object.keys(baseCounts[file] ?? {}),
    ]);
    for (const rule of rules) {
      const current = currentCounts[file]?.[rule] ?? 0;
      const baseline = baseCounts[file]?.[rule] ?? 0;
      if (current > baseline) regressions.push({ file, rule, baseline, current, delta: current - baseline });
      if (current < baseline) improvements.push({ file, rule, baseline, current, delta: baseline - current });
    }
  }

  regressions.sort((a, b) => b.delta - a.delta);
  improvements.sort((a, b) => b.delta - a.delta);
  return { regressions, improvements };
}

async function lintBaseFiles(baseSha, files) {
  const eslint = new ESLint({ cwd: ROOT });
  const report = [];

  for (const file of files) {
    const source = runGit(["show", `${baseSha}:${file}`]);
    if (source.status !== 0) continue;
    const result = await eslint.lintText(source.stdout, { filePath: join(ROOT, file) });
    report.push(...result);
  }

  return report;
}

function readHistoricalBaseline() {
  if (!existsSync(BASELINE_PATH)) {
    console.error("❌ Branch-base indisponível e .eslint-baseline.json não encontrado.");
    process.exit(2);
  }
  const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
  return { counts: baseline.counts ?? {}, totalErrors: baseline.totalErrors ?? 0 };
}

const outputDir = mkdtempSync(join(tmpdir(), "eslint-gate-"));
const outputPath = join(outputDir, "report.json");
const execution = spawnSync(
  "npx",
  ["eslint", "src", "--format", "json", "-o", outputPath],
  { cwd: ROOT, stdio: ["ignore", "inherit", "inherit"], shell: false },
);

if (execution.status !== 0 && execution.status !== 1) {
  console.error(`❌ eslint falhou com status ${execution.status}`);
  process.exit(2);
}

const currentReport = JSON.parse(readFileSync(outputPath, "utf8"));
const currentGlobal = aggregate(currentReport);
const base = resolveBaseCommit();

let currentCounts = currentGlobal.counts;
let baseCounts;
let referenceLabel;
let changedFiles = null;

if (base) {
  changedFiles = changedSourceFiles(base.sha);
  const changedSet = new Set(changedFiles);
  currentCounts = Object.fromEntries(Object.entries(currentGlobal.counts).filter(([file]) => changedSet.has(file)));
  baseCounts = aggregate(await lintBaseFiles(base.sha, changedFiles)).counts;
  referenceLabel = `${base.label} (${base.sha.slice(0, 10)})`;
} else {
  const historical = readHistoricalBaseline();
  baseCounts = historical.counts;
  referenceLabel = `snapshot histórico (${historical.totalErrors} erros)`;
}

const { regressions, improvements } = compareCounts(currentCounts, baseCounts);
const regressionTotal = regressions.reduce((sum, item) => sum + item.delta, 0);
const improvementTotal = improvements.reduce((sum, item) => sum + item.delta, 0);

console.log(`ESLint gate — ${currentGlobal.totalErrors} erro(s) globais · referência: ${referenceLabel}`);
if (changedFiles) console.log(`Arquivos de aplicação alterados analisados: ${changedFiles.length}`);
if (improvementTotal > 0) console.log(`✨ Drift positivo: ${improvementTotal} erro(s) eliminado(s).`);

if (regressions.length === 0) {
  console.log("✅ Nenhuma regressão de lint nos arquivos alterados.");
  process.exit(0);
}

console.error(`\n❌ ${regressionTotal} erro(s) novo(s) de ESLint em ${regressions.length} par(es) file:rule:`);
for (const item of regressions.slice(0, MAX_LIST)) {
  console.error(`  • ${item.file} [${item.rule}] base=${item.baseline} → atual=${item.current} (+${item.delta})`);
  for (const example of currentGlobal.messages.get(`${item.file}::${item.rule}`) ?? []) {
    console.error(`      ${example}`);
  }
}
if (regressions.length > MAX_LIST) console.error(`  … e mais ${regressions.length - MAX_LIST} par(es) omitido(s).`);
process.exit(1);
