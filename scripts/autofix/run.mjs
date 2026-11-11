#!/usr/bin/env node
/**
 * autofix — correções mecânicas do código, SEM IA e SEM rede.
 *
 * Uso:
 *   node scripts/autofix/run.mjs                      # simula (padrão): mostra o que mudaria e desfaz
 *   node scripts/autofix/run.mjs --apply              # aplica no working tree (não faz git add/commit)
 *   node scripts/autofix/run.mjs --steps colors,prettier
 *   node scripts/autofix/run.mjs --all                # todos os arquivos de src/ (cuidado: churn de prettier)
 *   node scripts/autofix/run.mjs --base origin/main   # base para "arquivos alterados" (padrão: merge-base com origin/main, senão HEAD)
 *   node scripts/autofix/run.mjs --json out.json      # relatório em JSON
 *
 * Passos padrão (invisíveis): eslint-fix, prettier, docs-drift.
 * Passos visuais (só com --steps): colors.
 *
 * Segurança: snapshot em memória de todo arquivo tocado; ao final roda eslint (sem novos
 * erros) e o gate de typecheck (quando um passo `ts` mexeu em .ts/.tsx). Se algo falhar,
 * TUDO é revertido. Em simulação sempre reverte. Nunca usa git para desfazer, então não
 * atropela alterações suas ainda não commitadas.
 *
 * Saída: 0 ok | 1 validação falhou (revertido) | 2 uso/lock | 3 simulação com mudanças pendentes
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { STEPS } from './steps.mjs';
import { acquireLock } from '../lib/pid-lock.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : undefined);

const APPLY = flag('--apply');
const ALL = flag('--all');
const only = opt('--steps')?.split(',').map((s) => s.trim()).filter(Boolean);
const unknown = (only ?? []).filter((n) => !STEPS.some((s) => s.name === n));
if (unknown.length) {
  console.error(`Passo(s) desconhecido(s): ${unknown.join(', ')}. Válidos: ${STEPS.map((s) => s.name).join(', ')}`);
  process.exit(2);
}
const selected = STEPS.filter((s) => (only ? only.includes(s.name) : !s.visual));

const git = (args) => spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });

function resolveBase() {
  const given = opt('--base');
  if (given) return given;
  const mb = git(['merge-base', 'HEAD', 'origin/main']);
  return mb.status === 0 ? mb.stdout.trim() : 'HEAD';
}

function listSrcFiles() {
  if (ALL) return git(['ls-files', 'src']).stdout.split('\n').filter(Boolean);
  const base = resolveBase();
  const changed = git(['diff', '--name-only', '--diff-filter=ACMR', base]).stdout.split('\n');
  const untracked = git(['ls-files', '--others', '--exclude-standard']).stdout.split('\n');
  return [...new Set([...changed, ...untracked])].filter((f) => f.startsWith('src/') && existsSync(f));
}

// --- trava (no máx. 1 execução por repositório; a máquina trava com paralelismo) -------------
const lockFile = join(tmpdir(), `autofix-${createHash('sha1').update(ROOT).digest('hex').slice(0, 8)}.lock`);
const lock = acquireLock(lockFile);
if (lock.busy) { console.error(`autofix ${lock.message}`); process.exit(2); }

// --- snapshots / restauração ---------------------------------------------------------------
const originals = new Map(); // arquivo -> conteúdo original
const read = (f) => readFileSync(f, 'utf8');
function snapshot(files) { for (const f of files) if (!originals.has(f)) originals.set(f, read(f)); }
function changedFiles() { return [...originals].filter(([f, c]) => read(f) !== c).map(([f]) => f); }
function restoreAll() { for (const [f, c] of originals) if (read(f) !== c) writeFileSync(f, c); }

let finished = false;
process.on('exit', () => {
  if (!finished) restoreAll(); // interrompido (Ctrl+C / erro): volta ao original
  lock.release();
});
process.on('SIGINT', () => process.exit(130));
process.on('SIGTERM', () => process.exit(143));

// --- validação -----------------------------------------------------------------------------
async function verify(changed, tsSteps) {
  const problems = [];
  const code = changed.filter((f) => /\.(?:ts|tsx|js|jsx)$/.test(f));
  if (code.length) {
    const { ESLint } = await import('eslint');
    const eslint = new ESLint({ cwd: ROOT, errorOnUnmatchedPattern: false });
    const errors = async (f, text) => {
      if (await eslint.isPathIgnored(f)) return 0;
      const [r] = await eslint.lintText(text, { filePath: resolve(ROOT, f) });
      return r?.errorCount ?? 0;
    };
    for (const f of code) {
      const [b, a] = [await errors(f, originals.get(f)), await errors(f, read(f))];
      if (a > b) problems.push(`eslint: ${f} ganhou ${a - b} erro(s) (${b} -> ${a})`);
    }
  }
  const touchedTs = changed.some((f) => /\.tsx?$/.test(f)) && tsSteps.size > 0;
  if (touchedTs) {
    console.log('… typecheck (gate de baseline) — leva ~1 min');
    const r = spawnSync('node', ['scripts/check-typecheck-baseline.mjs'], { cwd: ROOT, encoding: 'utf8' });
    if (r.status !== 0) problems.push(`typecheck: gate falhou\n${(r.stdout + r.stderr).split('\n').slice(-12).join('\n')}`);
  }
  return problems;
}

// --- main ----------------------------------------------------------------------------------
const ctx = { root: ROOT, srcFiles: listSrcFiles(), touched: new Set(), notes: [] };
console.log(`autofix (${APPLY ? 'APLICAR' : 'simulação'}) — ${ctx.srcFiles.length} arquivo(s) de src na base, passos: ${selected.map((s) => s.name).join(', ')}`);

const report = { mode: APPLY ? 'apply' : 'dry-run', steps: [], notes: ctx.notes, problems: [] };
const tsSteps = new Set();

for (const step of selected) {
  const files = step.targets(ctx);
  snapshot(files);
  const before = new Map(files.map((f) => [f, read(f)]));
  await step.run(ctx, files);
  const changed = files.filter((f) => read(f) !== before.get(f));
  changed.forEach((f) => ctx.touched.add(f));
  if (step.ts && changed.some((f) => /\.tsx?$/.test(f))) tsSteps.add(step.name);
  report.steps.push({ name: step.name, visual: step.visual, scanned: files.length, changed });
  console.log(`• ${step.name.padEnd(11)} ${String(changed.length).padStart(4)} alterado(s) / ${files.length} — ${step.describe}`);
  if (step.name === 'prettier' && changed.length > 50) {
    ctx.notes.push(`prettier alterou ${changed.length} arquivos (o .prettierrc usa aspas simples, o código legado usa duplas). Rode sem --all.`);
  }
}

const changed = changedFiles();
report.problems = await verify(changed, tsSteps);

if (report.problems.length) {
  restoreAll();
  finished = true;
  console.error('\n✖ Validação falhou — tudo revertido:');
  report.problems.forEach((p) => console.error('  - ' + p));
} else if (!APPLY) {
  restoreAll();
  finished = true;
} else {
  finished = true;
}

report.totalChanged = changed.length;
if (ctx.notes.length) { console.log('\nNotas:'); ctx.notes.forEach((n) => console.log('  - ' + n)); }
console.log(`\n${report.problems.length ? 'REVERTIDO' : APPLY ? 'APLICADO' : 'SIMULAÇÃO'}: ${changed.length} arquivo(s) ${APPLY && !report.problems.length ? 'alterado(s)' : 'seriam alterados'}.`);
if (changed.length && !report.problems.length) {
  changed.slice(0, 25).forEach((f) => console.log('  ~ ' + f));
  if (changed.length > 25) console.log(`  … +${changed.length - 25}`);
}
const jsonPath = opt('--json');
if (jsonPath) writeFileSync(jsonPath, JSON.stringify(report, null, 2));

process.exit(report.problems.length ? 1 : !APPLY && changed.length ? 3 : 0);
