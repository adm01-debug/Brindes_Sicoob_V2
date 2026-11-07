#!/usr/bin/env node
/**
 * check-search-imports
 * --------------------------------------------------------------
 * Gate estático: hooks de busca devem ser importados pelo alias
 * `@/hooks/search/`, nunca por caminho relativo. Import relativo
 * quebra o bundle quando o hook muda de pasta e escapa do alias
 * configurado no Vite/TS.
 *
 * Uso local:
 *   node scripts/check-search-imports.mjs
 *   node scripts/check-search-imports.mjs --root src --json
 *
 * Exit codes: 0 = limpo, 1 = violações, 2 = uso inválido.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { runCli, EXIT_FAIL } from './lib/cli.mjs';

const SEARCH_HOOKS_PATH = '@/hooks/search/';
const HOOK_NAMES = ['usePopularSearchItems', 'useVoiceSearchAction'];
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage']);
const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx']);

const RELATIVE_HOOK_IMPORT = new RegExp(
  `from\\s+['"](?:\\./|\\.\\./)+(?:${HOOK_NAMES.join('|')})['"]`,
);

function checkFile(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const violations = [];
  content.split('\n').forEach((line, index) => {
    if (RELATIVE_HOOK_IMPORT.test(line)) {
      violations.push({ file: filePath, line: index + 1, text: line.trim() });
    }
  });
  return violations;
}

function walkDir(dir, violations) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) walkDir(fullPath, violations);
    } else if (SOURCE_EXTS.has(extname(entry))) {
      violations.push(...checkFile(fullPath));
    }
  }
}

await runCli(
  {
    name: 'check-search-imports',
    summary: 'Garante que hooks de busca sejam importados via alias @/hooks/search/.',
    usage: 'node scripts/check-search-imports.mjs [opções]',
    spec: {
      root: { type: 'string', default: 'src', description: 'Diretório raiz a inspecionar' },
      json: { type: 'boolean', default: false, description: 'Emite o resultado em JSON' },
    },
    examples: [
      'node scripts/check-search-imports.mjs',
      'node scripts/check-search-imports.mjs --root src --json',
    ],
  },
  async ({ values, log }) => {
    let stat;
    try {
      stat = statSync(values.root);
    } catch {
      return { exitCode: EXIT_FAIL, message: `Diretório não encontrado: ${values.root}` };
    }
    if (!stat.isDirectory()) {
      return { exitCode: EXIT_FAIL, message: `Não é um diretório: ${values.root}` };
    }

    const violations = [];
    walkDir(values.root, violations);

    if (values.json) {
      console.log(JSON.stringify({ root: values.root, violations }, null, 2));
    } else {
      for (const violation of violations) {
        log.error(
          `Import relativo de hook de busca em ${relative(process.cwd(), violation.file)}:${violation.line}: "${violation.text}". Use "${SEARCH_HOOKS_PATH}".`,
          violation.file,
        );
      }
    }

    if (violations.length > 0) {
      return {
        exitCode: EXIT_FAIL,
        message: `${violations.length} import(s) relativo(s) encontrado(s); substitua por "${SEARCH_HOOKS_PATH}".`,
      };
    }
        if (!values.json) log.info(`Nenhum import relativo de hook de busca em ${values.root}.`);
    return 0;
  },
);
