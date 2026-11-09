#!/usr/bin/env node
/**
 * rotina — roda o levantamento (scripts/rules/run.mjs) de forma agendada, SEM IA.
 *
 * Em vez de analisar o working tree (que pode estar atrasado ou sujo), faz `git fetch`, cria um
 * worktree temporário (detached) do origin/main, roda as regras nele e remove o worktree.
 * Não escreve nada no repositório nem no seu working tree. Compara com a execução anterior e
 * grava só o que é NOVO e o que foi RESOLVIDO.
 *
 *   node scripts/rules/rotina.mjs                    # origin/main -> ~/relatorios/gaps-brindes-sicoob-v2/AAAA-MM-DD/
 *   node scripts/rules/rotina.mjs --ref origin/dia   # outra ref
 *   node scripts/rules/rotina.mjs --out <dir> --keep 30 --max-load 30
 *
 * Saída: <out>/AAAA-MM-DD/{latest.md,latest.json,RESUMO.md} e <out>/ULTIMO.md (cópia do resumo).
 * Sai 0 mesmo com achados (achado não é falha da rotina); sai 1 só se a rotina em si quebrar.
 * Pula (exit 0) se a máquina estiver sob carga alta ou se outra execução estiver em andamento.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, readdirSync, symlinkSync, copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { homedir, loadavg, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url))); // repo onde este script vive
const argv = process.argv.slice(2);
const opt = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
const REF = opt('--ref', 'origin/main');
const OUT = resolve(opt('--out', join(homedir(), 'relatorios', 'gaps-brindes-sicoob-v2')));
const KEEP = Number(opt('--keep', 30));
const MAX_LOAD = Number(opt('--max-load', 30));
const git = (args, cwd = REPO, timeout = 120000) => spawnSync('git', args, { cwd, encoding: 'utf8', timeout });
const log = (m) => console.log(`[rotina ${new Date().toISOString()}] ${m}`);

if (loadavg()[0] > MAX_LOAD) { log(`carga ${loadavg()[0].toFixed(1)} > ${MAX_LOAD}: pulando esta rodada`); process.exit(0); }

const lock = join(tmpdir(), 'gaps-rotina.lock');
try { mkdirSync(lock); } catch {
  const pidFile = join(lock, 'pid');
  let alive = false;
  try { process.kill(Number(readFileSync(pidFile, 'utf8')), 0); alive = true; } catch { /* sem pid ou morto */ }
  if (alive) { log('já em execução: pulando'); process.exit(0); }
  rmSync(lock, { recursive: true, force: true });
  mkdirSync(lock);
}
writeFileSync(join(lock, 'pid'), String(process.pid));

let work = null;
const cleanup = () => {
  if (work) { git(['worktree', 'remove', '--force', work]); rmSync(work, { recursive: true, force: true }); git(['worktree', 'prune']); work = null; }
  rmSync(lock, { recursive: true, force: true });
};
process.on('exit', cleanup);
process.on('SIGINT', () => process.exit(130));
process.on('SIGTERM', () => process.exit(143));

const notes = [];
const fetched = git(['fetch', 'origin', '--quiet', '--no-tags']);
if (fetched.status !== 0) notes.push(`git fetch falhou (${(fetched.stderr || 'sem rede?').trim().split('\n')[0]}); usando a última cópia local de ${REF}`);
const sha = git(['rev-parse', '--verify', `${REF}^{commit}`]);
if (sha.status !== 0) { log(`ref ${REF} não existe`); process.exit(1); }
const commit = sha.stdout.trim();

work = mkdtempSync(join(tmpdir(), 'gaps-wt-'));
const add = git(['worktree', 'add', '--detach', '--quiet', work, commit]);
if (add.status !== 0) { log(`worktree falhou: ${add.stderr}`); process.exit(1); }
if (existsSync(join(REPO, 'node_modules'))) symlinkSync(join(REPO, 'node_modules'), join(work, 'node_modules'));

const day = new Date().toISOString().slice(0, 10);
const dayDir = join(OUT, day);
mkdirSync(dayDir, { recursive: true });
log(`analisando ${REF} @ ${commit.slice(0, 9)}`);
// O runner vive no repo atual (pode ainda não estar no ref analisado); roda com cwd = worktree.
const run = spawnSync('node', [join(REPO, 'scripts/rules/run.mjs'), '--out', dayDir], { cwd: work, encoding: 'utf8', timeout: 20 * 60 * 1000 });
if (run.status !== 0 || !existsSync(join(dayDir, 'latest.json'))) { log(`runner falhou (exit ${run.status})\n${run.stderr}`); process.exit(1); }

// --- comparação com a execução anterior -------------------------------------------------------
const flat = (json) => new Map(json.results.flatMap((r) => r.items.map((i) => [`${r.id}|${i}`, { id: r.id, severity: r.severity, item: i }])));
const cur = JSON.parse(readFileSync(join(dayDir, 'latest.json'), 'utf8'));
const prevDir = readdirSync(OUT).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d < day).sort().pop();
const prev = prevDir && existsSync(join(OUT, prevDir, 'latest.json')) ? JSON.parse(readFileSync(join(OUT, prevDir, 'latest.json'), 'utf8')) : null;
const a = flat(cur), b = prev ? flat(prev) : new Map();
const novos = prev ? [...a].filter(([k]) => !b.has(k)).map(([, v]) => v) : [];
const resolvidos = prev ? [...b].filter(([k]) => !a.has(k)).map(([, v]) => v) : [];
const ORDER = { alta: 0, media: 1, baixa: 2 };
const bySev = (x, y) => ORDER[x.severity] - ORDER[y.severity];
const tabela = cur.results.filter((r) => r.items.length).sort(bySev).map((r) => `| ${r.severity} | ${r.id} | ${r.kind} | ${r.items.length} |`);
const lista = (rows) => rows.sort(bySev).slice(0, 40).map((v) => `- [${v.severity}] ${v.id}: ${v.item}`);

const resumo = [
  `# Gaps — ${day}`,
  `Ref analisada: \`${REF}\` @ \`${commit.slice(0, 9)}\` · comparação com: ${prevDir ?? '— (primeira execução)'}`,
  ...notes.map((n) => `> ⚠️ ${n}`),
  ``,
  `## Mudanças desde a última execução`,
  prev ? `**${novos.length} novo(s)** · **${resolvidos.length} resolvido(s)**` : 'Primeira execução: sem base de comparação.',
  ...(novos.length ? [``, `### Novos`, ...lista(novos)] : []),
  ...(resolvidos.length ? [``, `### Resolvidos`, ...lista(resolvidos)] : []),
  ``,
  `## Situação atual`,
  `| severidade | regra | tipo | qtd |`, `|---|---|---|---|`, ...tabela,
  ``,
  `Detalhe completo: \`${join(dayDir, 'latest.md')}\``,
].join('\n');
writeFileSync(join(dayDir, 'RESUMO.md'), resumo);
copyFileSync(join(dayDir, 'RESUMO.md'), join(OUT, 'ULTIMO.md'));

// --- retenção ---------------------------------------------------------------------------------
const dias = readdirSync(OUT).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
for (const d of dias.slice(0, Math.max(0, dias.length - KEEP))) rmSync(join(OUT, d), { recursive: true, force: true });

log(`ok — ${novos.length} novo(s), ${resolvidos.length} resolvido(s) → ${join(OUT, 'ULTIMO.md')}`);
