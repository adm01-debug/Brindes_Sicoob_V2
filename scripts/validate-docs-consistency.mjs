#!/usr/bin/env node
/**
 * validate-docs-consistency
 * --------------------------------------------------------------
 * Confere a consistência entre docs/MODULES.md, docs/ROUTES.md e
 * docs/INVENTARIO_FUNCIONALIDADES_v2.md: links internos válidos e
 * rotas críticas do inventário presentes no mapa de rotas.
 *
 * Antes: documento ausente lançava `throw new Error` cru (stack
 * trace, exit 1 sem mensagem útil) e não havia como apontar outro
 * diretório de docs.
 *
 * Exit codes: 0 = consistente, 1 = inconsistência, 2 = uso inválido.
 */
import fs from 'node:fs';
import path from 'node:path';
import { runCli, EXIT_FAIL } from './lib/cli.mjs';

const CRITICAL_ROUTE_PREFIXES = ['/admin', '/dashboard'];
const DOC_LINK_PATTERN = /\[[^\]]*\]\((docs\/[^)\s]+\.md)\)/g;
const ROUTE_PATTERN = /\/[a-z0-9/-]+/g;

await runCli(
  {
    name: 'validate-docs-consistency',
    summary: 'Valida links e rotas entre os documentos de arquitetura.',
    usage: 'node scripts/validate-docs-consistency.mjs [opções]',
    spec: {
      'docs-dir': { type: 'string', default: 'docs', description: 'Diretório de documentação' },
      json: { type: 'boolean', default: false, description: 'Emite o resultado em JSON' },
    },
    examples: [
      'node scripts/validate-docs-consistency.mjs',
      'node scripts/validate-docs-consistency.mjs --docs-dir docs',
    ],
  },
  async ({ values, log }) => {
    const docsDir = values['docs-dir'];
    const modulesFile = path.join(docsDir, 'MODULES.md');
    const routesFile = path.join(docsDir, 'ROUTES.md');
    const inventoryFile = path.join(docsDir, 'INVENTARIO_FUNCIONALIDADES_v2.md');

    const required = [modulesFile, routesFile, inventoryFile];
    const missing = required.filter((file) => !fs.existsSync(file));
    if (missing.length > 0) {
      return {
        exitCode: EXIT_FAIL,
        message: `Documento(s) obrigatório(s) ausente(s): ${missing.join(', ')}`,
      };
    }

    const modulesContent = fs.readFileSync(modulesFile, 'utf8');
    const routesContent = fs.readFileSync(routesFile, 'utf8');
    const inventoryContent = fs.readFileSync(inventoryFile, 'utf8');

    const errors = [];
    const warnings = [];

    if (!inventoryContent.includes('MODULES.md')) {
      warnings.push('O inventário não cita explicitamente o Master Module Index (MODULES.md).');
    }

    for (const match of modulesContent.matchAll(DOC_LINK_PATTERN)) {
      const target = match[1];
      if (!fs.existsSync(target)) {
        errors.push(`Link quebrado em MODULES.md: ${target}`);
      }
    }

    const criticalRoutes = new Set(
      (inventoryContent.match(ROUTE_PATTERN) ?? []).filter((route) =>
        CRITICAL_ROUTE_PREFIXES.some((prefix) => route.startsWith(prefix)),
      ),
    );
    for (const route of criticalRoutes) {
      if (!routesContent.includes(route)) {
        errors.push(`Rota crítica "${route}" citada no inventário não encontrada em ROUTES.md`);
      }
    }

    if (values.json) {
      console.log(JSON.stringify({ errors, warnings, criticalRoutes: [...criticalRoutes] }, null, 2));
    } else {
      for (const warning of warnings) log.warn(warning);
      for (const error of errors) log.error(error);
    }

    if (errors.length > 0) {
      return { exitCode: EXIT_FAIL, message: `${errors.length} inconsistência(s) documental(is).` };
    }
    log.info(`Consistência documental validada (${criticalRoutes.size} rota(s) crítica(s)).`);
    return 0;
  },
);
