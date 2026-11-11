#!/usr/bin/env node
/**
 * e2e-cleanup
 * --------------------------------------------------------------
 * Solicita a limpeza de dados E2E na edge function `e2e-cleanup`.
 * Roda via `npm run test:cleanup`.
 *
 * Exit codes: 0 = cleanup aceito, 1 = falha no backend, 2 = uso inválido.
 */
import { validateE2ETarget } from "./e2e-target.mjs";
import { runCli, EXIT_FAIL } from "./lib/cli.mjs";

await runCli(
  {
    name: 'e2e-cleanup',
    summary: 'Solicita a limpeza de dados E2E na edge function e2e-cleanup.',
    usage: 'node scripts/e2e-cleanup.mjs [opções]',
    spec: {
      'dry-run': {
        type: 'boolean',
        default: process.env.E2E_CLEANUP_DRY_RUN !== '0',
        description: 'Executa em modo simulação (padrão: ligado, desligue com --no-dry-run)',
      },
      json: { type: 'boolean', default: false, description: 'Emite o resultado em JSON' },
    },
    examples: ['node scripts/e2e-cleanup.mjs', 'node scripts/e2e-cleanup.mjs --no-dry-run'],
  },
  async ({ values, log }) => {
    let target;
    try {
      target = validateE2ETarget({
        url: process.env.E2E_SUPABASE_URL,
        projectId: process.env.E2E_SUPABASE_PROJECT_ID,
        allowedProjectId: process.env.E2E_ALLOWED_PROJECT_ID,
        publishableKey: process.env.E2E_SUPABASE_PUBLISHABLE_KEY,
        serviceRoleKey: process.env.E2E_SUPABASE_SERVICE_ROLE_KEY,
      });
    } catch (err) {
      if (err.message === 'Configuração obrigatória do destino E2E ausente.') {
        return { exitCode: 2, message: err.message };
      }
      throw err;
    }
    const cleanupToken = process.env.E2E_CLEANUP_TOKEN;
    const email = process.env.E2E_USER_EMAIL;

    if (!cleanupToken || !email) {
      return {
        exitCode: 2,
        message: 'E2E_CLEANUP_TOKEN e E2E_USER_EMAIL são obrigatórios para solicitar cleanup.',
      };
    }

    const dryRun = values['dry-run'];
    // `new URL` evita `//functions` quando a variável termina com barra (a guarda aceita `https://x.supabase.co/`).
    const response = await fetch(new URL('/functions/v1/e2e-cleanup', process.env.E2E_SUPABASE_URL), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-e2e-cleanup-token': cleanupToken,
      },
      body: JSON.stringify({ email, dryRun }),
    });

    if (!response.ok) {
      return {
        exitCode: EXIT_FAIL,
        message: `Cleanup E2E recusado pelo backend (HTTP ${response.status}).`,
      };
    }

    // A edge responde HTTP 200 com `{ ok: false, errorTables: [...] }` quando a limpeza é parcial ou
    // falha; checar só `response.ok` dava "cleanup aceito" (exit 0) com dados E2E sobrando.
    const payload = await response.json().catch(() => null);
    if (!payload || payload.ok !== true) {
      const tables = Array.isArray(payload?.errorTables) ? payload.errorTables.join(', ') : '';
      return {
        exitCode: EXIT_FAIL,
        message: payload
          ? `Cleanup E2E incompleto${tables ? ` (tabelas com erro: ${tables})` : ''}.`
          : 'Cleanup E2E respondeu sem JSON válido; resultado desconhecido.',
      };
    }

    if (values.json) {
      console.log(JSON.stringify({ projectId: target.projectId, dryRun, email }, null, 2));
    } else {
      log.info(`Cleanup E2E aceito para ${target.projectId}; dryRun=${dryRun}.`);
    }
    return 0;
  },
);
