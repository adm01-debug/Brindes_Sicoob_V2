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
    const target = validateE2ETarget({
      url: process.env.E2E_SUPABASE_URL,
      projectId: process.env.E2E_SUPABASE_PROJECT_ID,
      allowedProjectId: process.env.E2E_ALLOWED_PROJECT_ID,
      publishableKey: process.env.E2E_SUPABASE_PUBLISHABLE_KEY,
      serviceRoleKey: process.env.E2E_SUPABASE_SERVICE_ROLE_KEY,
    });
    const cleanupToken = process.env.E2E_CLEANUP_TOKEN;
    const email = process.env.E2E_USER_EMAIL;

    if (!cleanupToken || !email) {
      return {
        exitCode: 2,
        message: 'E2E_CLEANUP_TOKEN e E2E_USER_EMAIL são obrigatórios para solicitar cleanup.',
      };
    }

    const dryRun = values['dry-run'];
    const response = await fetch(`${process.env.E2E_SUPABASE_URL}/functions/v1/e2e-cleanup`, {
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

    if (values.json) {
      console.log(JSON.stringify({ projectId: target.projectId, dryRun, email }, null, 2));
    } else {
      log.info(`Cleanup E2E aceito para ${target.projectId}; dryRun=${dryRun}.`);
    }
    return 0;
  },
);
