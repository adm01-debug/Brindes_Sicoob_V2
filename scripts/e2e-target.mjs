const FORBIDDEN_PROJECT_IDS = new Set([
  "cfmzkthhgliqelozlmwu",
  "doufsxqlfjyuvxuezpln",
]);

/** Valida destino isolado de QA sem imprimir URL nem credenciais. */
export function validateE2ETarget({
  url,
  projectId,
  allowedProjectId,
  publishableKey,
  serviceRoleKey,
}) {
  if (!url || !projectId || !allowedProjectId || !publishableKey || !serviceRoleKey) {
    throw new Error("Configuração obrigatória do destino E2E ausente.");
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("URL de destino E2E inválida.");
  }

  const hostProjectId = parsedUrl.hostname.match(/^([a-z0-9-]+)\.supabase\.co$/)?.[1];
  if (
    parsedUrl.protocol !== "https:" ||
    parsedUrl.port !== "" ||
    parsedUrl.pathname !== "/" ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.search ||
    parsedUrl.hash ||
    !hostProjectId ||
    hostProjectId !== projectId
  ) {
    throw new Error("URL e identificador do projeto E2E não correspondem a um endpoint Supabase HTTPS.");
  }

  if (projectId !== allowedProjectId || FORBIDDEN_PROJECT_IDS.has(projectId)) {
    throw new Error("Destino E2E fora da allowlist de homologação.");
  }

  if (!/^[a-z0-9-]{3,63}$/.test(projectId)) {
    throw new Error("Identificador do projeto E2E inválido.");
  }

  if (publishableKey === serviceRoleKey) {
    throw new Error("Credenciais E2E inválidas: as chaves publicável e privilegiada devem ser distintas.");
  }

  return { projectId };
}
