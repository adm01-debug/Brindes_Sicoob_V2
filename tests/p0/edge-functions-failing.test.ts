/** P0 — contratos de segurança e degradação das Edge Functions críticas. */
import { describe, expect, it } from "vitest";
import { expectContract, expectInOrder, source } from "./_contracts";

describe("P0 — Edge Functions críticas", () => {
  it("full-op-diagnostics: autentica e produz exatamente os quatro checks declarados", () => {
    const diagnostics = source("supabase/functions/full-op-diagnostics/index.ts");
    const checkIds = ["is_dev", "can_grant_mcp_full", "validate_mcp_key", "consume_step_up_token"];

    expectContract(diagnostics, [
      "userClient.auth.getUser()",
      'return jsonResponse({ error: "unauthenticated" }, 401, req)',
      "const checks: CheckResult[] = []",
      "summary",
      "checks",
    ]);
    for (const checkId of checkIds) expect(diagnostics).toContain(`id: "${checkId}"`);
  });

  it("crm-db-bridge: converte ausência do módulo opcional em leitura vazia estável", () => {
    const bridge = source("supabase/functions/crm-db-bridge/index.ts");

    expectContract(bridge, [
      "function isMissingTableError",
      'error.code === "PGRST205"',
      "function createOptionalSelectFallback",
      "data: isSingleRecord ? null : []",
      "unavailable: true",
    ]);
  });

  it("crm-db-bridge: impede escrita quando o módulo opcional não está disponível", () => {
    const bridge = source("supabase/functions/crm-db-bridge/index.ts");

    expectContract(bridge, [
      "function createOptionalWriteError",
      "return jsonResponse({ error }, 503)",
      "isOptionalQuoteTable",
    ]);
  });

  it("external-db-bridge: exige usuário autenticado e bloqueia dados sensíveis", () => {
    const bridge = source("supabase/functions/external-db-bridge/index.ts");

    expectInOrder(bridge, [
      "const isSensitive = SENSITIVE_TABLES.has(table)",
      "const safeTechniqueOptions = isReadOperation && aliasType === 'techniqueOptions'",
      "if (isSensitive && !safeTechniqueOptions && !['dev', 'supervisor'].includes",
      "const userId = actor?.user.id",
      "if (!userId) return jsonResponse({ error: 'Autenticação necessária' }, 401",
    ]);
  });

  it("external-db-bridge: repete somente falhas transitórias e degrada para 503", () => {
    const bridge = source("supabase/functions/external-db-bridge/index.ts");

    expectContract(bridge, [
      "retrySupabaseCall<unknown>",
      "maxAttempts: 3",
      "isTransient: isBridgeTransient",
      "if (isBridgeTransient(abortErr))",
      "Backend instável — tente novamente em instantes",
      "503",
    ]);
  });

  it("connections-auto-test: limita lotes, testa em paralelo e persiste só o resultado final", () => {
    const autoTest = source("supabase/functions/connections-auto-test/index.ts");

    expectContract(autoTest, [
      "const BATCH_SIZE = 5",
      "return Promise.all(batch.map(async (conn) =>",
      "skipPersistence: true",
      "const final = await persistResult(",
      "for (let i = 0; i < conns.length; i += BATCH_SIZE)",
    ]);
  });

  it("e2e-cleanup: exige segredo, rate limit, allow-list exata e dry-run por padrão", () => {
    const cleanup = source("supabase/functions/e2e-cleanup/index.ts");

    expectInOrder(cleanup, [
      'admin.rpc(',
      '"e2e_cleanup_check_rate_limit"',
      'req.headers.get("x-e2e-cleanup-token")',
      'Deno.env.get("E2E_CLEANUP_ALLOWED_EMAILS")',
      "if (!allowed.includes(email))",
    ]);
    expectContract(cleanup, [
      "const dryRun = body.dryRun === false ? false : true",
      '{ "Retry-After": String(resetIn) }',
    ]);
    expect(cleanup).not.toContain("auth.admin.deleteUser");
  });

  it("force-global-logout: pagina usuários, preserva o executor e audita o resultado", () => {
    const logout = source("supabase/functions/force-global-logout/index.ts");

    expectInOrder(logout, [
      "while (true)",
      "auth.admin.listUsers({ page, perPage })",
      "if (u.id === caller.id) continue",
      'auth.admin.signOut(u.id, "global")',
      '.from("admin_audit_log").insert',
    ]);
  });

  it("handlers críticos normalizam valores unknown antes da resposta JSON", () => {
    const handlers = [
      source("supabase/functions/full-op-diagnostics/index.ts"),
      source("supabase/functions/detect-new-device/index.ts"),
      source("supabase/functions/force-global-logout/index.ts"),
    ];

    for (const handler of handlers) {
      expect(handler).toMatch(/instanceof Error\s*\?\s*\w+\.message\s*:/);
      expect(handler).not.toMatch(/JSON\.stringify\(\{\s*error:\s*(?:error|err|e)\s*\}\)/);
    }
  });
});
