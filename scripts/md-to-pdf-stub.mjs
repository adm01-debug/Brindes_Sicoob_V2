#!/usr/bin/env node
/**
 * md-to-pdf-stub.mjs — gerador de PDF a partir de Markdown via Playwright
 *
 * Substitui o pacote md-to-pdf removido por CVEs críticos em braces
 * (decisoes.json 2026-10-07). Usa Playwright + Chromium headless.
 *
 * Uso:
 *   node scripts/md-to-pdf-stub.mjs [arquivo.md] [saida.pdf]
 *
 * Padrão:
 *   - entrada: public/reports/AUDIT_REPORT_<rev>.md (mais recente) ou
 *              DOSSIA_AUDITORIA_ENTERPRISE_V5.md
 *   - saída:   reports/<nome-do-md>.pdf
 *
 * Exit codes:
 *   0 — PDF gerado com sucesso
 *   1 — falha de execução (arquivo não encontrado, Playwright com erro, etc.)
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

function resolveInput(arg) {
  if (arg) {
    // Argumento explícito: falha se não encontrar
    if (existsSync(arg)) return resolve(arg);
    const fromRoot = resolve(REPO_ROOT, arg);
    if (existsSync(fromRoot)) return fromRoot;
    return { error: `Arquivo não encontrado: ${arg}` };
  }

  // Auto-descoberta: procura relatório mais recente em public/reports/
  const reportsDir = join(REPO_ROOT, 'public', 'reports');
  if (existsSync(reportsDir)) {
    const mds = readdirSync(reportsDir)
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse();
    if (mds.length > 0) return join(reportsDir, mds[0]);
  }

  // Fallback: DOSSIE na raiz
  const fallback = join(REPO_ROOT, 'DOSSIA_AUDITORIA_ENTERPRISE_V5.md');
  if (existsSync(fallback)) return fallback;

  return null;
}

function resolveOutput(inputPath, arg) {
  if (arg) return resolve(arg);
  const outDir = join(REPO_ROOT, 'reports');
  mkdirSync(outDir, { recursive: true });
  return join(outDir, basename(inputPath).replace(/\.md$/i, '.pdf'));
}

async function mdToPdf(inputPath, outputPath) {
  const markdown = readFileSync(inputPath, 'utf8');
  const body = marked.parse(markdown);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: process.env.QA_CHROMIUM_PATH ?? undefined,
  });
  try {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.route('**/*', route => route.abort());
    await page.setContent(
      `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <style>
    @page { size: A4; margin: 12mm 10mm; }
    body { color: #172026; font: 12px/1.6 Arial, sans-serif; }
    h1, h2, h3 { color: #003641; break-after: avoid; }
    h1 { font-size: 22px; border-bottom: 2px solid #003641; padding-bottom: 4px; }
    h2 { font-size: 16px; border-bottom: 1px solid #cad5d4; padding-bottom: 2px; }
    h3 { font-size: 13px; }
    table { border-collapse: collapse; width: 100%; margin: 8px 0; }
    th, td { border: 1px solid #cad5d4; padding: 5px 8px; text-align: left; vertical-align: top; }
    th { background: #e9f6f4; font-weight: bold; }
    tr:nth-child(even) td { background: #f7fafa; }
    pre, code { white-space: pre-wrap; overflow-wrap: anywhere; background: #f4f4f4;
                padding: 2px 4px; border-radius: 3px; font-size: 11px; }
    a { color: #007f73; }
    blockquote { border-left: 4px solid #007f73; margin: 0; padding-left: 12px; color: #555; }
    hr { border: none; border-top: 1px solid #cad5d4; margin: 12px 0; }
  </style>
</head>
<body>${body}</body>
</html>`,
      { waitUntil: 'load' },
    );
    await page.pdf({
      path: outputPath,
      format: 'A4',
      margin: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' },
      printBackground: true,
    });
  } finally {
    await browser.close();
  }
}

// ── main ─────────────────────────────────────────────────────────────────────
const [, , arg1, arg2] = process.argv;
const inputResult = resolveInput(arg1);

if (!inputResult) {
  console.error('❌ md-to-pdf-stub: nenhum arquivo Markdown encontrado.');
  console.error('   Uso: node scripts/md-to-pdf-stub.mjs [arquivo.md] [saida.pdf]');
  console.error('   Ou coloque um relatório em public/reports/*.md');
  process.exit(1);
}
if (typeof inputResult === 'object' && inputResult.error) {
  console.error(`❌ md-to-pdf-stub: ${inputResult.error}`);
  console.error('   Uso: node scripts/md-to-pdf-stub.mjs [arquivo.md] [saida.pdf]');
  process.exit(1);
}

const inputPath = inputResult;

const outputPath = resolveOutput(inputPath, arg2);

console.log(`📄 Convertendo Markdown para PDF via Playwright...`);
console.log(`   Entrada : ${inputPath}`);
console.log(`   Saída   : ${outputPath}`);

try {
  await mdToPdf(inputPath, outputPath);
  const size = statSync(outputPath).size;
  console.log(`✅ PDF gerado com sucesso: ${outputPath} (${(size / 1024).toFixed(1)} KiB)`);
} catch (err) {
  console.error(`❌ Falha ao gerar PDF: ${err.message}`);
  process.exit(1);
}
