import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20261016180000_harden_storage_and_public_favorites_acl.sql",
  "utf8",
);
const applicator = readFileSync("scripts/db/apply-sicoob-migrations.mjs", "utf8");
const scenario = readFileSync("scripts/qa/simular-storage-acl-hardening.py", "utf8");
const mainWorkflow = readFileSync(".github/workflows/ci.yml", "utf8");
const sicoobWorkflow = readFileSync(".github/workflows/sicoob-ci.yml", "utf8");

describe("hardening de Storage e ACL pública", () => {
  it("revisa explicitamente apenas as assinaturas públicas por token", () => {
    expect(migration).toContain("public.get_sicoob_invitation(text)");
    expect(migration).toContain("public.get_public_favorite_list(text)");
    expect(migration).toContain("public.get_public_favorite_reactions(text,text)");
    expect(migration).toContain("OR EXISTS (SELECT 1 FROM public.audit_security_definer_acl())");
  });

  it("remove policies amplas e iguala DELETE ao escopo de SELECT", () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "Public Access to Proposals"');
    expect(migration).toContain('DROP POLICY IF EXISTS "Authenticated users can upload proposals"');
    expect(migration).toContain('DROP POLICY IF EXISTS "Authenticated users can delete proposals"');
    expect(migration).toContain('CREATE POLICY "proposals_quote_scope_delete"');
    expect(migration).toContain("v_proposals_delete IS DISTINCT FROM v_proposals_select");
  });

  it("autoriza a quarentena pelo RBAC canônico sem e-mail ou JWT", () => {
    const policy = migration.slice(
      migration.indexOf('CREATE POLICY "Supervisores podem visualizar quarentena"'),
      migration.indexOf("DO $assert$"),
    );
    expect(policy).toContain("public.is_supervisor_or_above((SELECT auth.uid()))");
    expect(policy).not.toMatch(/email|auth\.jwt/i);
  });

  it("agenda o health-check apenas com Vault válido e restringe RPCs operacionais", () => {
    expect(migration).toContain("public.dispatch_sicoob_connections_health_check()");
    expect(migration).toContain("public.get_connections_hub_operational_evidence()");
    expect(migration).toContain("'7,22,37,52 * * * *'");
    expect(migration).toContain("sicoob_project_url");
    expect(migration).toContain("sicoob_internal_function_secret");
    expect(migration).toContain("net.http_post");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("TO service_role");
  });

  it("expõe evidência dos dois crons de webhook e quatro triggers esperados", () => {
    for (const expected of [
      "webhook-retry-failed",
      "webhook-logs-cleanup-daily",
      "trg_dispatch_webhook_quotes",
      "trg_dispatch_webhook_orders",
      "trg_dispatch_webhook_discount",
      "trg_dispatch_webhook_kit_share",
    ]) {
      expect(migration).toContain(expected);
    }
  });

  it("mantém a migration no aplicador allowlisted e valida cenários em banco descartável", () => {
    expect(applicator).toContain(
      'file: "supabase/migrations/20261016180000_harden_storage_and_public_favorites_acl.sql"',
    );
    expect(scenario).toContain('"banco_canonico_alterado": False');
    expect(scenario).toContain('"terceiro_nao_exclui_proposta"');
    expect(scenario).toContain('"email_admin_sem_rbac_nao_le_quarentena"');
    expect(scenario).toContain('"vault_invalido_remove_cron"');
    expect(scenario).toContain('"evidencia_cobre_quatro_triggers"');
    expect(mainWorkflow).toContain("python3 scripts/qa/simular-storage-acl-hardening.py");
    expect(sicoobWorkflow).toContain("python3 scripts/qa/simular-storage-acl-hardening.py");
  });
});
