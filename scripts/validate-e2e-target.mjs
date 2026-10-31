import { validateE2ETarget } from "./e2e-target.mjs";

try {
  const { projectId } = validateE2ETarget({
    url: process.env.E2E_SUPABASE_URL,
    projectId: process.env.E2E_SUPABASE_PROJECT_ID,
    allowedProjectId: process.env.E2E_ALLOWED_PROJECT_ID,
    publishableKey: process.env.E2E_SUPABASE_PUBLISHABLE_KEY,
    serviceRoleKey: process.env.E2E_SUPABASE_SERVICE_ROLE_KEY,
  });

  console.log(`Destino E2E validado: ${projectId}.`);
} catch (error) {
  console.error(`[e2e-target] ${error instanceof Error ? error.message : "Falha na validação do destino."}`);
  process.exitCode = 1;
}
