/**
 * Passos do autofix. Cada passo só EDITA arquivos; quem snapshota, valida e desfaz
 * é o orquestrador (run.mjs). Nenhum passo chama IA ou rede.
 *
 * Contrato: { name, visual, ts, describe, targets(ctx) -> string[], run(ctx, files) }
 *   visual: muda a aparência (fora do conjunto padrão; só com --steps)
 *   ts:     pode alterar tipos -> exige o gate de typecheck ao final
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { convertColors } from './colors-map.mjs';

const CODE_RE = /^src\/.*\.(?:ts|tsx|js|jsx)$/;
const STYLE_RE = /^src\/.*\.(?:ts|tsx|js|jsx|css)$/;
const COLOR_DIRS = ['src/pages/sicoob', 'src/components/sicoob']; // mesmo escopo do check-sicoob-hardcoded-colors
const DRIFT_DOC = 'docs/EDGE_FUNCTIONS_DRIFT.md';

const union = (ctx, re) => [...new Set([...ctx.srcFiles, ...ctx.touched])].filter((f) => re.test(f));

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(?:tsx|ts|js|jsx)$/.test(e.name) && !/\.(?:test|spec)\./.test(e.name)) out.push(p);
  }
  return out;
}

export const STEPS = [
  {
    name: 'colors',
    visual: true,
    ts: false,
    describe: 'cores hardcoded (amber/blue/emerald/red) -> tokens warning/info/success/destructive',
    targets: () => COLOR_DIRS.flatMap((d) => walk(d)),
    async run(ctx, files) {
      for (const f of files) {
        const src = readFileSync(f, 'utf8');
        const { output, review } = convertColors(src);
        if (output === src) continue;
        writeFileSync(f, output);
        if (review.length) ctx.notes.push(`colors: ${f}:${review.join(',')} fundo sólido + text-white — revisar par *-foreground`);
      }
    },
  },
  {
    name: 'eslint-fix',
    visual: false,
    ts: true,
    describe: 'eslint --fix (regras com autofix) nos arquivos alterados',
    targets: (ctx) => union(ctx, CODE_RE),
    async run(ctx, files) {
      const { ESLint } = await import('eslint');
      const eslint = new ESLint({ cwd: ctx.root, fix: true, errorOnUnmatchedPattern: false });
      const lintable = [];
      for (const f of files) if (!(await eslint.isPathIgnored(f))) lintable.push(f);
      if (lintable.length === 0) return;
      await ESLint.outputFixes(await eslint.lintFiles(lintable));
    },
  },
  {
    name: 'prettier',
    visual: false,
    ts: false,
    describe: 'prettier --write nos arquivos alterados (mesmo que o lint-staged faz no commit)',
    targets: (ctx) => union(ctx, STYLE_RE),
    async run(ctx, files) {
      const prettier = await import('prettier');
      for (const f of files) {
        const info = await prettier.getFileInfo(f, { ignorePath: '.prettierignore', resolveConfig: true });
        if (info.ignored || !info.inferredParser) continue;
        const src = readFileSync(f, 'utf8');
        try {
          const cfg = await prettier.resolveConfig(f);
          const out = await prettier.format(src, { ...cfg, filepath: f });
          if (out !== src) writeFileSync(f, out);
        } catch (err) {
          ctx.notes.push(`prettier: ${f} ignorado (${String(err.message).split('\n')[0]})`);
        }
      }
    },
  },
  {
    name: 'docs-drift',
    visual: false,
    ts: false,
    describe: `regenera ${DRIFT_DOC} (só grava se mudar algo além do timestamp)`,
    targets: () => [DRIFT_DOC],
    async run(ctx, files) {
      const [doc] = files;
      const before = readFileSync(doc, 'utf8');
      const r = spawnSync('node', ['scripts/compare-edge-functions.mjs'], { cwd: ctx.root, stdio: 'ignore' });
      if (r.status !== 0) {
        writeFileSync(doc, before);
        ctx.notes.push('docs-drift: gerador falhou, doc mantido');
        return;
      }
      const strip = (s) => s.replace(/^Data: .*$/m, '');
      if (strip(readFileSync(doc, 'utf8')) === strip(before)) writeFileSync(doc, before);
    },
  },
];
