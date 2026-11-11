#!/usr/bin/env node
/**
 * generate-routes-map
 * --------------------------------------------------------------
 * Gera docs/ROUTES.md a partir de src/routes/config/*.ts.
 *
 * Antes: `readdirSync` estourava stack trace se a pasta não existisse,
 * a saída era escrita sem checar se algo foi encontrado (gerando um
 * ROUTES.md vazio) e não havia como validar em CI se o documento
 * está atualizado.
 *
 * Agora: `--check` compara o conteúdo gerado com o arquivo em disco e
 * falha se estiver desatualizado, sem escrever nada.
 *
 * Exit codes: 0 = ok, 1 = desatualizado/erro, 2 = uso inválido.
 */
import fs from 'node:fs';
import path from 'node:path';
import { runCli, EXIT_FAIL } from './lib/cli.mjs';

const ROUTE_PATTERN =
  /path:\s*["']([^"']+)["'],\s*component:\s*lazyWithRetry\(\(\)\s*=>\s*import\(["']([^"']+)["']\)\)/g;
const DEMO_ROUTES = new Set(['/loja-demo', '/demonstracao']);

function buildMarkdown(routesDir) {
  const files = fs
    .readdirSync(routesDir)
    .filter((file) => file.endsWith('.ts'))
    .sort();

  let markdown = '# 🗺️ Mapa Automático de Rotas\n\n';
  markdown += '> Documento gerado automaticamente via `scripts/generate-routes-map.mjs`\n\n';

  let total = 0;
  for (const file of files) {
    const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
    const sectionName = file.replace(/\.ts$/, '').toUpperCase();

    markdown += `## 📂 Seção: ${sectionName}\n`;
    markdown += '| Rota | Componente |\n';
    markdown += '|------|------------|\n';

    for (const match of content.matchAll(ROUTE_PATTERN)) {
      const routePath = match[1];
      const componentPath = match[2];
      const condition =
        file === 'public.ts' && DEMO_ROUTES.has(routePath)
          ? ' (somente dev ou `VITE_ENABLE_DEMO_PAGES=true`)'
          : '';
      markdown += `| \`${routePath}\` | \`${componentPath}\`${condition} |\n`;
      total += 1;
    }

    markdown += '\n';
  }

  return { markdown: `${markdown.trimEnd()}\n`, total, files: files.length };
}

await runCli(
  {
    name: 'generate-routes-map',
    summary: 'Gera (ou valida) docs/ROUTES.md a partir das configurações de rota.',
    usage: 'node scripts/generate-routes-map.mjs [opções]',
    spec: {
      'routes-dir': {
        type: 'string',
        default: 'src/routes/config',
        description: 'Diretório com as configurações de rota',
      },
      output: { type: 'string', default: 'docs/ROUTES.md', description: 'Arquivo de saída' },
      check: {
        type: 'boolean',
        default: false,
        description: 'Não escreve; falha se o arquivo estiver desatualizado',
      },
    },
    examples: [
      'node scripts/generate-routes-map.mjs',
      'node scripts/generate-routes-map.mjs --check',
    ],
  },
  async ({ values, log }) => {
    if (!fs.existsSync(values['routes-dir'])) {
      return { exitCode: EXIT_FAIL, message: `Diretório não encontrado: ${values['routes-dir']}` };
    }

    const { markdown, total, files } = buildMarkdown(values['routes-dir']);
    if (total === 0) {
      return {
        exitCode: EXIT_FAIL,
        message: `Nenhuma rota reconhecida em ${values['routes-dir']} (${files} arquivo(s)). O padrão de rota pode ter mudado.`,
      };
    }

    if (values.check) {
      const current = fs.existsSync(values.output) ? fs.readFileSync(values.output, 'utf8') : null;
      if (current === markdown) {
        log.info(`${values.output} está atualizado (${total} rota(s)).`);
        return 0;
      }
      return {
        exitCode: EXIT_FAIL,
        message: `${values.output} está desatualizado. Rode "node scripts/generate-routes-map.mjs".`,
      };
    }

    fs.mkdirSync(path.dirname(values.output), { recursive: true });
    fs.writeFileSync(values.output, markdown);
    log.info(`Mapa de rotas gerado em ${values.output} (${total} rota(s), ${files} arquivo(s)).`);
    return 0;
  },
);
