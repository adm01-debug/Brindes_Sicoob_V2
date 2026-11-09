#!/usr/bin/env node
/**
 * rules — levantamento de falhas, gaps e melhorias SEM IA.
 * Cada regra (scripts/rules/rules/*.mjs) é uma checagem determinística de algo que o projeto
 * já definiu como regra (doc, gate de CI, convenção). O runner NÃO inventa regra de negócio.
 *
 *   node scripts/rules/run.mjs                 # roda tudo, imprime resumo, grava reports/gaps/latest.{md,json}
 *   node scripts/rules/run.mjs --only rls,edge # filtra por prefixo de id
 *   node scripts/rules/run.mjs --out <dir>     # onde gravar o relatório
 *   node scripts/rules/run.mjs --strict        # exit 1 se houver achado de severidade alta
 *   node scripts/rules/run.mjs --list          # lista as regras
 *
 * Só LÊ o repositório (os gates existentes são executados em sequência, 1 por vez).
 * Correção automática, quando existe, fica em scripts/autofix (campo "correção" do relatório).
 */
import { readdirSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const opt = (n) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : undefined);
const only = opt('--only')?.split(',').filter(Boolean);
const OUT = resolve(ROOT, opt('--out') ?? 'reports/gaps');

function walk(dir, out = []) {
  let entries = [];
  try { entries = readdirSync(dir); } catch { return out; }
  for (const n of entries) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

const dir = new URL('./rules/', import.meta.url);
const rules = [];
for (const f of readdirSync(fileURLToPath(dir)).filter((n) => n.endsWith('.mjs')).sort()) {
  const mod = (await import(new URL(f, dir).href)).default;
  rules.push(...(Array.isArray(mod) ? mod : [mod]));
}
// a regra de ambiente precisa rodar primeiro (preenche ctx.behind)
rules.sort((a, b) => (b.id === 'ambiente-branch-defasada') - (a.id === 'ambiente-branch-defasada'));
const selected = rules.filter((r) => !only || only.some((p) => r.id.startsWith(p)));

if (argv.includes('--list')) {
  selected.forEach((r) => console.log(`${r.id.padEnd(30)} ${r.severity.padEnd(6)} ${r.kind.padEnd(9)} ${r.title}`));
  process.exit(0);
}

const ctx = { root: ROOT, behind: 0, walk };
const results = [];
for (const r of selected) {
  const t0 = Date.now();
  let res;
  try { res = await r.run(ctx); } catch (e) { res = { items: [], error: String(e.message ?? e) }; }
  results.push({ id: r.id, kind: r.kind, severity: r.severity, title: r.title, fix: r.fix, items: res.items ?? [], note: res.note, error: res.error, ms: Date.now() - t0 });
  const n = res.items?.length ?? 0;
  console.log(`${res.error ? '!' : n ? '✖' : '✓'} ${r.id.padEnd(30)} ${String(n).padStart(4)}  ${res.error ? 'ERRO: ' + res.error : res.note ? '(' + res.note.slice(0, 70) + '…)' : ''}`);
}

const ORDER = { alta: 0, media: 1, baixa: 2 };
const found = results.filter((r) => r.items.length).sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
const md = [
  `# Levantamento de falhas, gaps e melhorias`,
  `Gerado em ${new Date().toISOString()} por \`scripts/rules/run.mjs\` (sem IA). ${ctx.behind > 0 ? `⚠️ Clone ${ctx.behind} commit(s) atrás de origin/main.` : ''}`,
  ``,
  `Regras executadas: ${results.length} · com achados: ${found.length} · alta: ${found.filter((f) => f.severity === 'alta').length}`,
  ``,
  ...found.flatMap((f) => [
    `## [${f.severity.toUpperCase()}] ${f.id} — ${f.kind} (${f.items.length})`,
    f.title, ``,
    `**Correção:** ${f.fix}`, ...(f.note ? [``, `> ${f.note}`] : []), ``,
    ...f.items.slice(0, 60).map((i) => `- ${i}`), ...(f.items.length > 60 ? [`- … +${f.items.length - 60}`] : []), ``,
  ]),
  ...results.filter((r) => r.note && !r.items.length).map((r) => `> ${r.id}: ${r.note}`),
  ...results.filter((r) => r.error).map((r) => `> ERRO em ${r.id}: ${r.error}`),
].join('\n');

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'latest.md'), md);
writeFileSync(join(OUT, 'latest.json'), JSON.stringify({ behind: ctx.behind, results }, null, 2));
console.log(`\n${found.length} regra(s) com achados → ${join(OUT, 'latest.md')}`);
const comErro = results.filter((r) => r.error);
if (comErro.length) console.error(`\n⚠ ${comErro.length} regra(s) com ERRO (resultado inconclusivo): ${comErro.map((r) => r.id).join(', ')}`);
process.exit(argv.includes('--strict') && (comErro.length || found.some((f) => f.severity === 'alta')) ? 1 : 0);
