#!/usr/bin/env node
/**
 * validate-audit-links
 * --------------------------------------------------------------
 * Valida que os links externos dos documentos de auditoria estão
 * alcançáveis. Roda no workflow `security-compliance.yml`.
 *
 * Antes: qualquer link quebrado apenas imprimia um aviso e o script
 * saía com código 0 — o gate nunca reprovava. Também não havia
 * timeout efetivo no fallback GET (o `clearTimeout` só rodava no
 * caminho de sucesso) e nenhum limite de concorrência.
 *
 * Agora: falha (exit 1) quando há link inalcançável, respeita
 * `--timeout`, limita concorrência e permite `--allow-missing` para
 * documentos ausentes.
 *
 * Exit codes: 0 = todos os links OK, 1 = link quebrado, 2 = uso inválido.
 */
import fs from 'node:fs';
import path from 'node:path';
import { runCli, EXIT_FAIL } from './lib/cli.mjs';

const DEFAULT_FILES = [
  'FINAL_ENTERPRISE_AUDIT_REPORT.md',
  'ENTERPRISE_AUDIT_REPORT_V6.md',
  'AUDIT_INVENTORY_DETAILED.md',
];

// Os relatórios de auditoria vivem em docs/audits/, não na raiz do repo.
const DEFAULT_DOCS_DIR = 'docs/audits';

const LINK_PATTERN = /https?:\/\/[^\s)<>"']+/g;

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const head = await fetch(url, { method: 'HEAD', signal: controller.signal });
    if (head.ok) return head;
    return await fetch(url, { method: 'GET', signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function checkLink(url, timeoutMs) {
  try {
    const response = await fetchWithTimeout(url, timeoutMs);
    return { url, status: response.status, ok: response.ok };
  } catch (error) {
    return { url, status: 0, ok: false, error: error.message };
  }
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

await runCli(
  {
    name: 'validate-audit-links',
    summary: 'Verifica se os links externos dos relatórios de auditoria respondem.',
    usage: 'node scripts/validate-audit-links.mjs [opções]',
    spec: {
      timeout: { type: 'string', default: '5000', description: 'Timeout por link em ms' },
      concurrency: { type: 'string', default: '5', description: 'Requisições simultâneas' },
      'allow-missing': {
        type: 'boolean',
        default: false,
        description: 'Não falha quando um documento de auditoria não existe',
      },
            'docs-dir': {
              type: 'string',
              default: DEFAULT_DOCS_DIR,
              description: 'Diretório onde estão os relatórios de auditoria',
            },
            json: { type: 'boolean', default: false, description: 'Emite o resultado em JSON' },
          },
          examples: [
            'node scripts/validate-audit-links.mjs',
            'node scripts/validate-audit-links.mjs --timeout 10000 --concurrency 3',
            'node scripts/validate-audit-links.mjs --docs-dir docs/audits',
          ],
  },
  async ({ values, log }) => {
    const timeoutMs = Number(values.timeout);
    const concurrency = Number(values.concurrency);
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      return { exitCode: 2, message: `--timeout inválido: ${values.timeout}` };
    }
    if (!Number.isInteger(concurrency) || concurrency <= 0) {
      return { exitCode: 2, message: `--concurrency inválido: ${values.concurrency}` };
    }

    const report = [];
    const missing = [];

    for (const file of DEFAULT_FILES) {
          const filePath = path.join(values['docs-dir'], file);
          if (!fs.existsSync(filePath)) {
            missing.push(file);
            continue;
          }
          const content = fs.readFileSync(filePath, 'utf8');
      const links = [...new Set(content.match(LINK_PATTERN) ?? [])];
      const results = await mapWithConcurrency(links, concurrency, (link) =>
        checkLink(link, timeoutMs),
      );
      report.push({ file, links: results });
    }

    if (missing.length > 0) {
      const message = `Documento(s) de auditoria ausente(s): ${missing.join(', ')}`;
      if (values['allow-missing']) log.warn(message);
      else return { exitCode: EXIT_FAIL, message };
    }

    const broken = report.flatMap((entry) =>
      entry.links.filter((link) => !link.ok).map((link) => ({ file: entry.file, ...link })),
    );

    if (values.json) {
      console.log(JSON.stringify({ report, broken, missing }, null, 2));
    } else {
      for (const entry of report) {
        log.info(`${entry.file}: ${entry.links.length} link(s) externo(s)`);
        for (const link of entry.links) {
          if (link.ok) console.log(`  OK    [${link.status}] ${link.url}`);
          else log.error(`  FALHA [${link.status || 'sem resposta'}] ${link.url}`, entry.file);
        }
      }
    }

    if (broken.length > 0) {
      return {
        exitCode: EXIT_FAIL,
        message: `${broken.length} link(s) externo(s) inalcançável(is).`,
      };
    }
    log.info('Todos os links externos responderam.');
    return 0;
  },
);
