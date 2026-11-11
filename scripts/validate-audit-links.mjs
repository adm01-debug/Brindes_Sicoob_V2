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
 * Documentos verificados: os relatórios versionados em `docs/audits/`
 * (obrigatórios) e, quando existirem, os que o pipeline acabou de gerar em
 * `reports/` (ou `AUDIT_REPORTS_DIR`). Passar arquivos como argumento
 * substitui essa lista. Documento sem link externo é informado como tal —
 * nunca como "todos responderam"; `--require-links` transforma isso em falha.
 *
 * Exit codes: 0 = todos os links OK, 1 = link quebrado, 2 = uso inválido.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { runCli, EXIT_FAIL } from './lib/cli.mjs';

const DEFAULT_FILES = [
  'FINAL_ENTERPRISE_AUDIT_REPORT.md',
  'ENTERPRISE_AUDIT_REPORT_V6.md',
  'AUDIT_INVENTORY_DETAILED.md',
];

// Os relatórios de auditoria vivem em docs/audits/, não na raiz do repo.
const DEFAULT_DOCS_DIR = 'docs/audits';

// Gerados pelo pipeline nesta execução: verificados quando presentes.
const GENERATED_DIR = process.env.AUDIT_REPORTS_DIR || 'reports';
const GENERATED_PATTERN = /^(?:DOSSIA_AUDITORIA_ENTERPRISE_V5|ENTERPRISE_AUDIT_REPORT_V6|AUDIT_EXPORT_.+)\.md$/;

const LINK_PATTERN = /https?:\/\/[^\s)<>"'`\]]+/g;
// Pontuação de prosa/markdown colada ao fim da URL não faz parte dela.
const TRAILING_PUNCTUATION = /[.,;:!?*_'"`\])}>]+$/;

/** URLs externas distintas de um texto markdown, sem pontuação colada. */
export function extractLinks(content) {
  const links = (content.match(LINK_PATTERN) ?? [])
    .map((link) => link.replace(TRAILING_PUNCTUATION, ''))
    .filter((link) => /^https?:\/\/[^/]/.test(link));
  return [...new Set(links)];
}

/** Arquivos a verificar: `{ path, label, required }`. */
export function resolveTargets({ positional, docsDir, generatedDir = GENERATED_DIR }) {
  if (positional.length > 0) {
    return positional.map((file) => ({ path: file, label: file, required: true }));
  }
  const targets = DEFAULT_FILES.map((file) => ({
    path: path.join(docsDir, file),
    label: file,
    required: true,
  }));
  let generated = [];
  try {
    generated = fs.readdirSync(generatedDir).filter((name) => GENERATED_PATTERN.test(name)).sort();
  } catch {
    generated = [];
  }
  for (const name of generated) {
    const file = path.join(generatedDir, name);
    targets.push({ path: file, label: file, required: false });
  }
  return targets;
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
      let head;
      try {
        head = await fetch(url, { method: 'HEAD', signal: controller.signal });
      } catch {
        // Alguns servidores encerram a conexão para HEAD mas atendem GET;
        // preserva o fallback para erros de transporte, respeitando o timeout.
        head = null;
      }
      if (head && head.ok) return head;
      const get = await fetch(url, { method: 'GET', signal: controller.signal });
      // Apenas o status importa; cancela o corpo para não prender o processo.
      await get.body?.cancel();
      return get;
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

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
await runCli(
  {
    name: 'validate-audit-links',
    summary: 'Verifica se os links externos dos relatórios de auditoria respondem.',
    usage: 'node scripts/validate-audit-links.mjs [opções] [arquivo.md ...]',
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
            'require-links': {
              type: 'boolean',
              default: false,
              description: 'Falha quando nenhum link externo é encontrado',
            },
            json: { type: 'boolean', default: false, description: 'Emite o resultado em JSON' },
          },
          examples: [
            'node scripts/validate-audit-links.mjs',
            'node scripts/validate-audit-links.mjs --timeout 10000 --concurrency 3',
            'node scripts/validate-audit-links.mjs --docs-dir docs/audits',
            'node scripts/validate-audit-links.mjs --require-links reports/AUDIT_REPORT_abc1234.md',
          ],
  },
  async ({ values, positional, log }) => {
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

    const targets = resolveTargets({ positional, docsDir: values['docs-dir'] });
    for (const target of targets) {
      if (!fs.existsSync(target.path)) {
        if (target.required) missing.push(target.label);
        continue;
      }
      const links = extractLinks(fs.readFileSync(target.path, 'utf8'));
      const results = await mapWithConcurrency(links, concurrency, (link) =>
        checkLink(link, timeoutMs),
      );
      report.push({ file: target.label, links: results });
    }

    if (missing.length > 0) {
      const message = `Documento(s) de auditoria ausente(s): ${missing.join(', ')}`;
      if (values['allow-missing']) log.warn(message);
      else return { exitCode: EXIT_FAIL, message };
    }

    const broken = report.flatMap((entry) =>
      entry.links.filter((link) => !link.ok).map((link) => ({ file: entry.file, ...link })),
    );

    const totalLinks = report.reduce((sum, entry) => sum + entry.links.length, 0);

    if (values.json) {
      console.log(JSON.stringify({ report, broken, missing, totalLinks }, null, 2));
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
    if (totalLinks === 0) {
      const message = `Nenhum link externo encontrado em ${report.length} documento(s); nada foi verificado.`;
      if (values['require-links']) return { exitCode: EXIT_FAIL, message };
      if (!values.json) log.warn(message);
      return 0;
    }
    if (!values.json) {
      log.info(`Todos os ${totalLinks} link(s) externo(s) de ${report.length} documento(s) responderam.`);
    }
    return 0;
  },
);
}
