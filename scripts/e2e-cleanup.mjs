import { validateE2ETarget } from "./e2e-target.mjs";

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
  throw new Error("E2E_CLEANUP_TOKEN e E2E_USER_EMAIL são obrigatórios para solicitar cleanup.");
}

const dryRun = process.env.E2E_CLEANUP_DRY_RUN !== "0";
const response = await fetch(`${process.env.E2E_SUPABASE_URL}/functions/v1/e2e-cleanup`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-e2e-cleanup-token": cleanupToken,
  },
  body: JSON.stringify({ email, dryRun }),
});

if (!response.ok) {
  throw new Error(`Cleanup E2E recusado pelo backend (HTTP ${response.status}).`);
}

console.log(`Cleanup E2E aceito para ${target.projectId}; dryRun=${dryRun}.`);
