import { pathToFileURL } from "node:url";
import path from "node:path";

const PROTECTED_PROJECT_IDS = new Set([
  "cfmzkthhgliqelozlmwu",
  "doufsxqlfjyuvxuezpln",
]);

const PROJECT_ID_PATTERN = /^[a-z0-9]{20}$/;

/**
 * Valida o destino do E2E remoto antes de qualquer chamada autenticada.
 * Retorna null quando o alvo é o projeto de homologação explicitamente autorizado.
 */
export function validateE2ESupabaseTarget({ url, projectId, expectedProjectId }) {
  if (!url || !projectId || !expectedProjectId) {
    return "Configure URL, project ref e E2E_SUPABASE_PROJECT_ID de homologação.";
  }

  if (!PROJECT_ID_PATTERN.test(projectId) || !PROJECT_ID_PATTERN.test(expectedProjectId)) {
    return "Os project refs do E2E devem ter o formato Supabase válido.";
  }

  if (PROTECTED_PROJECT_IDS.has(projectId) || PROTECTED_PROJECT_IDS.has(expectedProjectId)) {
    return "O E2E remoto não pode acessar os projetos Supabase protegidos.";
  }

  if (projectId !== expectedProjectId) {
    return "VITE_SUPABASE_PROJECT_ID não corresponde ao projeto de homologação autorizado.";
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return "VITE_SUPABASE_URL não é uma URL válida de homologação.";
  }

  const hasUnsafeUrlParts = Boolean(
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.port ||
    parsedUrl.search ||
    parsedUrl.hash ||
    parsedUrl.pathname !== "/"
  );

  if (
    parsedUrl.protocol !== "https:" ||
    parsedUrl.hostname !== `${expectedProjectId}.supabase.co` ||
    hasUnsafeUrlParts
  ) {
    return "VITE_SUPABASE_URL não corresponde ao projeto de homologação autorizado.";
  }

  return null;
}

function runCli() {
  const issue = validateE2ESupabaseTarget({
    url: process.env.VITE_SUPABASE_URL,
    projectId: process.env.VITE_SUPABASE_PROJECT_ID,
    expectedProjectId: process.env.E2E_SUPABASE_PROJECT_ID,
  });

  if (issue) {
    console.error(`::error title=Alvo E2E remoto bloqueado::${issue}`);
    process.exitCode = 1;
    return;
  }

  console.log("Projeto Supabase de homologação validado para o E2E remoto.");
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  runCli();
}
