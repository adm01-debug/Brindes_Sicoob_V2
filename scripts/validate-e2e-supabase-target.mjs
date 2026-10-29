import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED = [
  "E2E_SUPABASE_URL",
  "E2E_SUPABASE_PROJECT_ID",
  "E2E_SUPABASE_PUBLISHABLE_KEY",
  "E2E_SUPABASE_SERVICE_ROLE_KEY",
  "E2E_SUPABASE_CLEANUP_TOKEN",
];

const CANONICAL_PROJECTS = new Set([
  "cfmzkthhgliqelozlmwu",
  "doufsxqlfjyuvxuezpln",
]);

export function validateE2eSupabaseTarget(env = process.env) {
  const missing = REQUIRED.filter((name) => !env[name]?.trim());
  if (missing.length) {
    return `Configure no GitHub Actions os secrets de homologação ausentes: ${missing.join(", ")}.`;
  }

  let target;
  try {
    target = new URL(env.E2E_SUPABASE_URL);
  } catch {
    return "E2E_SUPABASE_URL deve ser uma URL Supabase válida.";
  }

  const projectId = env.E2E_SUPABASE_PROJECT_ID.trim();
  if (
    target.protocol !== "https:" ||
    target.hostname !== `${projectId}.supabase.co` ||
    target.username ||
    target.password ||
    target.port ||
    target.pathname !== "/" ||
    target.search ||
    target.hash
  ) {
    return "A URL precisa usar https://<project-ref>.supabase.co e corresponder a E2E_SUPABASE_PROJECT_ID.";
  }

  if (CANONICAL_PROJECTS.has(projectId)) {
    return "O projeto Supabase canônico está bloqueado para E2E; configure um projeto isolado de homologação.";
  }

  return null;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const error = validateE2eSupabaseTarget();
  if (error) {
    console.error(`::error title=Alvo E2E inseguro::${error}`);
    process.exitCode = 1;
  } else {
    console.log("Projeto E2E de homologação validado; projetos canônicos estão bloqueados.");
  }
}

