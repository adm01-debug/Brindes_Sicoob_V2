#!/usr/bin/env node
/**
 * validate-e2e-target
 * --------------------------------------------------------------
 * Valida que o destino E2E aponta para o projeto de homologação
 * permitido, sem imprimir URL nem credenciais.
 *
 * Exit codes: 0 = destino válido, 1 = destino inválido, 2 = uso inválido.
 */
import { validateE2ETarget } from "./e2e-target.mjs";
import { runCli } from "./lib/cli.mjs";

await runCli(
  {
    name: 'validate-e2e-target',
    summary: 'Valida o destino E2E contra a allowlist de homologação.',
    usage: 'node scripts/validate-e2e-target.mjs [opções]',
    spec: {
      json: { type: 'boolean', default: false, description: 'Emite o resultado em JSON' },
    },
    examples: ['node scripts/validate-e2e-target.mjs'],
  },
  async ({ values, log }) => {
    let result;
    try {
      result = validateE2ETarget({
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
    const { projectId } = result;

    if (values.json) {
      console.log(JSON.stringify({ projectId }, null, 2));
    } else {
      log.info(`Destino E2E validado: ${projectId}.`);
    }
    return 0;
  },
);
