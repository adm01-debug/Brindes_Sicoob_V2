const CANONICAL_PROJECT_IDS = new Set([
  "cfmzkthhgliqelozlmwu",
  "doufsxqlfjyuvxuezpln",
]);

export function validateSupabaseTarget(urlValue, projectId) {
  if (!urlValue || !projectId) return "missing_target";
  if (CANONICAL_PROJECT_IDS.has(projectId)) return "canonical_project";

  try {
    const target = new URL(urlValue);
    if (target.protocol !== "https:" || target.hostname !== `${projectId}.supabase.co`) {
      return "project_ref_mismatch";
    }
  } catch {
    return "invalid_url";
  }

  return null;
}

if (import.meta.main) {
  const error = validateSupabaseTarget(
    process.env.E2E_SUPABASE_URL,
    process.env.E2E_SUPABASE_PROJECT_ID,
  );

  if (error) {
    console.error(
      "::error title=Projeto E2E não isolado::Configure uma URL HTTPS que corresponda ao project ref dedicado de homologação; projetos canônicos são bloqueados.",
    );
    process.exitCode = 1;
  }
}
