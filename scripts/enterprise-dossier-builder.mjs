/**
 * enterprise-dossier-builder.mjs — dossiê de auditoria com evidências conferidas.
 *
 * Monta `reports/AUDIT_REPORT_<commit>.md|pdf` e `reports/AUDIT_ENTERPRISE_FINAL.md|pdf`
 * (npm run audit:dossier). `AUDIT_REPORTS_DIR` troca o diretório. A saída NÃO vai para
 * `public/`: tudo que está lá é servido pelo front como arquivo estático.
 *
 * Todo status é medido nesta execução: RLS pela RPC `check_tables_rls`, evidências pelo
 * arquivo que existe e contém o trecho citado, links por requisição HTTP com timeout.
 * O que não é medido sai rotulado como declaração.
 *
 * Requer VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.
 * Exit codes: 0 = dossiê gerado; 1 = falha de execução (RPC com erro/vazia, PDF);
 *             2 = configuração ausente.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { marked } from 'marked';
import { chromium } from '@playwright/test';
import {
  AUDIT_INVENTORY,
  DECLARED,
  fetchRlsTables,
  headCommit,
  indexRlsMigrations,
  lastCommitInfo,
  repoWebUrl,
  reportsDir,
  summarizeRls,
  verifyEvidence,
} from './lib/audit-evidence.mjs';

const LINK_TIMEOUT_MS = 8000;

function escapeMarkdownText(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('|', '\\|')
    .replace(/[\r\n]+/g, ' ');
}

async function renderMarkdownPdf(markdown, outputPath) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: process.env.QA_CHROMIUM_PATH || undefined,
  });
  try {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.route('**/*', (route) => route.abort());
    const body = marked.parse(markdown);
    await page.setContent(
      `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <style>
    @page { size: A4; margin: 10mm; }
    body { color: #172026; font: 12px/1.55 Arial, sans-serif; }
    h1, h2, h3 { color: #003641; break-after: avoid; }
    h1 { font-size: 24px; } h2 { font-size: 18px; } h3 { font-size: 14px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #cad5d4; padding: 6px; text-align: left; }
    th { background: #e9f6f4; }
    pre, code { white-space: pre-wrap; overflow-wrap: anywhere; }
    a { color: #007f73; }
  </style>
</head>
<body>${body}</body>
</html>`,
      { waitUntil: 'load' },
    );
    await page.pdf({
      path: outputPath,
      format: 'A4',
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      printBackground: true,
    });
  } finally {
    await browser.close();
  }
}

/** Último commit do caminho; sem histórico não inventa autor nem data. */
function getFileInfo(target, fallbackHash) {
  const log = lastCommitInfo(target, { format: '%h|%ad|%an', date: 'short' });
  if (!log) return { hash: fallbackHash, date: '—', author: '—' };
  const [hash, date, author] = log.split('|');
  return { hash, date, author };
}

export async function validateLink(url, { timeoutMs = LINK_TIMEOUT_MS, fetchImpl = fetch } = {}) {
  if (!url || typeof url !== 'string') return { ok: false, error: 'Empty URL' };
  if (/^https?:\/\//.test(url)) {
    let lastError = 'Validation failed after HEAD/GET';
    for (const method of ['HEAD', 'GET']) {
      try {
        const res = await fetchImpl(url, {
          method,
          signal: AbortSignal.timeout(timeoutMs),
          headers: method === 'GET' ? { Range: 'bytes=0-0' } : {},
        });
        await res.body?.cancel?.();
        if (res.ok) return { ok: true };
        lastError = `${res.status} ${res.statusText || ''}`.trim();
      } catch (e) {
        lastError = e.name === 'TimeoutError' ? `timeout após ${timeoutMs}ms` : e.message;
      }
    }
    return { ok: false, error: lastError };
  }
  const exists = fs.existsSync(url.split('#')[0]);
  return exists ? { ok: true } : { ok: false, error: 'Local file not found' };
}

/** Contagens pelo índice do git: sem shell e incluindo `tests/`, onde os testes moram. */
export function getCoverageMetrics() {
  let tracked = [];
  try {
    tracked = execFileSync('git', ['ls-files', '--', 'src', 'tests'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    })
      .split('\n')
      .filter(Boolean);
  } catch {
    tracked = [];
  }
  const isTest = (file) => /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file);
  const totalComponents = tracked.filter((f) => f.startsWith('src/') && f.endsWith('.tsx') && !isTest(f)).length;
  const totalTests = tracked.filter(isTest).length;

  let coverage = 'indisponível';
  let isReal = false;
  const summaryPath = 'coverage/coverage-summary.json';
  if (fs.existsSync(summaryPath)) {
    try {
      const percentage = JSON.parse(fs.readFileSync(summaryPath, 'utf8')).total?.lines?.pct;
      if (typeof percentage === 'number' && Number.isFinite(percentage)) {
        coverage = `${percentage}%`;
        isReal = true;
      }
    } catch {
      console.warn('⚠️ Erro ao ler summary de cobertura.');
    }
  }
  return { coverage, totalComponents, totalTests, real: isReal };
}

function evidenceStatus(feature) {
  const item = AUDIT_INVENTORY.find((entry) => entry.feature === feature);
  if (!item) return { item: null, check: { ok: false, checked: false }, label: DECLARED };
  const check = verifyEvidence(item);
  return { item, check, label: check.ok ? '✅ Evidência conferida' : `❌ ${check.reason}` };
}

async function buildDossier() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error(
      '❌ VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessários. Configure as variáveis de ambiente antes de executar este script.',
    );
    return 2;
  }

  const env = process.env.AUDIT_ENV || 'prod';
  const envLabel = escapeMarkdownText(env.toUpperCase());
  const repoUrl = repoWebUrl();
  if (!repoUrl) throw new Error('Não foi possível determinar a URL do repositório (origin/GITHUB_REPOSITORY).');

  console.log(`🚀 Iniciando Enterprise Dossier Builder v10.6 [Ambiente: ${env}]...`);

  const commitHash = headCommit();
  if (!commitHash) throw new Error('git rev-parse HEAD falhou: execute dentro do repositório.');

  const { createClient } = await import('@supabase/supabase-js');
  const rlsTables = await fetchRlsTables(createClient(supabaseUrl, supabaseKey));
  const rls = summarizeRls(rlsTables);
  const migrationOf = indexRlsMigrations();
  const metrics = getCoverageMetrics();

  const failedLinks = [];
  const linkCache = new Map();
  const checkLink = async (url) => {
    if (!linkCache.has(url)) linkCache.set(url, await validateLink(url));
    return linkCache.get(url);
  };

  let rlsReport =
    '### 🔒 Relatório de Cobertura RLS por Tabela e Rota\n\n| Tabela | Status | Verificação | Link de Migração | Última Alteração | Link Válido |\n| :--- | :--- | :--- | :--- | :--- | :--- |\n';

  for (const table of rlsTables) {
    const status = table.relrowsecurity ? '✅ PASSED' : '❌ FAILED';
    const file = migrationOf.get(table.relname.toLowerCase());
    if (!file) {
      rlsReport += `| ${escapeMarkdownText(table.relname)} | ${status} | Row Isolation | migration não localizada por análise estática | — | — |\n`;
      continue;
    }
    const info = getFileInfo(file, commitHash);
    const link = `${repoUrl}/blob/${info.hash}/${file}`;
    const validation = await checkLink(link);
    if (!validation.ok)
      failedLinks.push({ item: table.relname, url: link, error: validation.error });
    rlsReport += `| ${escapeMarkdownText(table.relname)} | ${status} | Row Isolation | [Ver Migração](${link}) | ${escapeMarkdownText(info.date)} por ${escapeMarkdownText(info.author)} | ${validation.ok ? '🟢' : `🔴 (${escapeMarkdownText(validation.error)})`} |\n`;
  }

  const gaps = [
    {
      item: 'Segregação de Logs de Admin',
      severity: 'P1',
      path: 'supabase/functions/admin-audit-hook/index.ts',
      quote: 'admin_audit_log',
    },
    {
      item: 'Criptografia de Dados em Repouso (Camada App)',
      severity: 'P2',
      path: 'src/services/encryption.ts',
      quote: 'AES-GCM',
    },
  ];

  let gapsReport =
    '### ⚠️ Lacunas Quantificadas (Audit Gaps)\n\n| Item | Severidade | Caminho do Arquivo | Status | Evidência Relacionada |\n| :--- | :--- | :--- | :--- | :--- |\n';
  for (const gap of gaps) {
    const check = verifyEvidence({ ...gap, status: 'implementado' });
    const info = getFileInfo(gap.path, commitHash);
    const status = check.ok ? `✅ Evidência conferida (\`${gap.quote}\`)` : `❌ ${escapeMarkdownText(check.reason)}`;
    gapsReport += `| ${gap.item} | **${gap.severity}** | \`${gap.path}\` | ${status} | [Link](${repoUrl}/blob/${info.hash}/${gap.path}) |\n`;
  }

  const financeiro = evidenceStatus('Precisão 4 Casas');
  const checklistItems = [
    {
      module: 'Segurança',
      item: 'RLS Multi-tenant',
      status: rls.compliant
        ? `✅ ${rls.withRls}/${rls.total} tabelas com RLS`
        : `❌ ${rls.without.length} tabela(s) sem RLS`,
      evidence: `${repoUrl}/commit/${commitHash}`,
      validated: rls.compliant ? 'Sim' : 'Não',
    },
    {
      module: 'Financeiro',
      item: 'Precisão 4-Dec',
      status: financeiro.label,
      evidence: `${repoUrl}/blob/${commitHash}/${financeiro.item?.path ?? ''}`,
      validated: financeiro.check.ok ? 'Sim' : 'Não',
    },
    {
      module: 'UX',
      item: 'WCAG Compliance',
      status: DECLARED,
      evidence: `${repoUrl}/blob/${commitHash}/scripts/validate-wcag-colors.mjs`,
      validated: '-',
    },
    {
      module: 'Governança',
      item: 'Blockchain Log',
      status: '⏳ A implementar',
      evidence: null,
      validated: '-',
    },
  ];

  let checklist =
    '### 📑 Checklist Auditável de Conformidade\n\n| Módulo | Item | Status | Evidência (Link/Commit) | Validado | Link Ativo |\n| :--- | :--- | :--- | :--- | :--- | :--- |\n';
  for (const item of checklistItems) {
    if (!item.evidence) {
      checklist += `| **${item.module}** | ${item.item} | ${item.status} | — | ${item.validated} | — |\n`;
      continue;
    }
    const validation = await checkLink(item.evidence);
    if (!validation.ok)
      failedLinks.push({ item: item.item, url: item.evidence, error: validation.error });
    checklist += `| **${item.module}** | ${item.item} | ${item.status} | [Ver Evidência](${item.evidence}) | ${item.validated} | ${validation.ok ? '🟢' : `🔴 (${escapeMarkdownText(validation.error)})`} |\n`;
  }

  let failureSection = '';
  if (failedLinks.length > 0) {
    failureSection =
      '\n<a name="failed-links"></a>\n### 🔴 Evidências com Falha de Validação\n\n| Item | URL | Causa da Falha |\n| :--- | :--- | :--- |\n';
    failedLinks.forEach((f) => {
      failureSection += `| ${escapeMarkdownText(f.item)} | \`${escapeMarkdownText(f.url)}\` | ${escapeMarkdownText(f.error)} |\n`;
    });
  }

  const rlsIntegrity = rls.compliant
    ? `${rls.pct}% (${rls.withRls}/${rls.total} tabelas do schema public com RLS ativo).`
    : `${rls.pct}% (${rls.withRls}/${rls.total}) — ❌ sem RLS: ${rls.without.map((name) => `\`${escapeMarkdownText(name)}\``).join(', ')}.`;
  const generatedAt = new Date();

  const body = `
# 🛡️ DOSSIÊ DE AUDITORIA ENTERPRISE - PROMAGIFTS SICOOB [${envLabel}]
**ID da Auditoria:** \`AUDIT-${commitHash}-${generatedAt.getTime()}\`
**Ref de Versão:** [${commitHash}](${repoUrl}/commit/${commitHash})
**Ambiente:** ${envLabel}
**Data de Geração:** ${generatedAt.toISOString()}
**Gerado por:** \`scripts/enterprise-dossier-builder.mjs\`

---

## 1. ÍNDICE DE NAVEGAÇÃO
1. [Resumo Executivo](#resumo)
2. [Checklist de Conformidade](#checklist)
3. [Cobertura RLS Detalhada](#rls-report)
4. [Lacunas e Riscos (Gaps)](#gaps)
${failedLinks.length > 0 ? '5. [Falhas de Validação](#failed-links)\n6. [Trilha de Evidências (Git Genesis)](#evidencias)\n' : '5. [Trilha de Evidências (Git Genesis)](#evidencias)\n'}

---

<a name="resumo"></a>
## 2. RESUMO EXECUTIVO
Auditoria automatizada no ambiente **${envLabel}**. Status com ✅/❌ foram medidos nesta execução; itens com 📝 são declarações de projeto, não medições.

### 📈 Métricas de Cobertura de Código (Métricas Reais: ${metrics.real ? '✅' : '❌'})
- **Cobertura de Linhas (Vitest):** ${metrics.coverage}
- **Componentes TSX Identificados:** ${metrics.totalComponents}
- **Arquivos de Teste Detectados:** ${metrics.totalTests}
- **Integridade de RLS:** ${rlsIntegrity}

<a name="checklist"></a>
${checklist}

<a name="rls-report"></a>
${rlsReport}

<a name="gaps"></a>
${gapsReport}

${failureSection}

<a name="evidencias"></a>
## ${failedLinks.length > 0 ? '6' : '5'}. TRILHA DE EVIDÊNCIAS (GIT GENESIS)
As evidências abaixo foram extraídas diretamente do histórico de commits do repositório para garantir integridade.

- **Commit auditado:** ${commitHash}
- **Ambiente:** ${envLabel}
- **Links de evidência verificados:** ${linkCache.size} (${failedLinks.length} com falha)
`;
  const digest = createHash('sha256').update(body).digest('hex');
  const finalContent = `${body}- **SHA-256 do conteúdo acima:** \`${digest}\`

---
*Relatório gerado automaticamente em ${generatedAt.toISOString()}.*
`;

  const outDir = reportsDir();
  const reportPath = path.join(outDir, `AUDIT_REPORT_${commitHash}.md`);
  fs.writeFileSync(reportPath, finalContent);
  fs.writeFileSync(path.join(outDir, 'AUDIT_ENTERPRISE_FINAL.md'), finalContent);
  console.log(`✅ Dossier MD gerado: ${reportPath}`);

  console.log('📄 Convertendo para PDF...');
  const pdfPath = path.join(outDir, `AUDIT_REPORT_${commitHash}.pdf`);
  await renderMarkdownPdf(finalContent, pdfPath);
  fs.copyFileSync(pdfPath, path.join(outDir, 'AUDIT_ENTERPRISE_FINAL.pdf'));
  console.log(`✅ PDF gerado com sucesso: ${pdfPath}`);

  if (!rls.compliant) console.warn(`⚠️ ${rls.without.length} tabela(s) sem RLS registradas no dossiê.`);
  if (failedLinks.length > 0) console.warn(`⚠️ ${failedLinks.length} link(s) de evidência com falha registrados no dossiê.`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  buildDossier()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err) => {
      console.error(`❌ Falha no Enterprise Dossier Builder: ${err?.message ?? err}`);
      process.exitCode = 1;
    });
}
