import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20261015230500_reconcile_search_analytics_telemetry.sql",
  "utf8",
);
const grantsMigration = readFileSync(
  "supabase/migrations/20261015233500_restrict_search_analytics_grants.sql",
  "utf8",
);
const selectPolicyMigration = readFileSync(
  "supabase/migrations/20261015235000_consolidate_search_analytics_select_policy.sql",
  "utf8",
);

describe("migration de reconciliação da telemetria de busca", () => {
  it("preserva e converte as colunas legadas pelo padrão expand/contract", () => {
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS user_id uuid");
    expect(migration).toContain("SET user_id = seller_id");
    expect(migration).toContain("ALTER COLUMN seller_id DROP NOT NULL");
    expect(migration).toContain("SET search_context = filters_used::text");
    expect(migration).not.toMatch(/DROP COLUMN\s+(seller_id|filters_used)/i);
  });

  it("vincula escrita ao usuário autenticado e separa leitura própria e gerencial", () => {
    expect(migration).toContain(
      "WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = user_id)",
    );
    expect(migration).toContain(
      "USING ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = user_id)",
    );
    expect(migration).toContain("USING ((SELECT public.is_manager_or_admin()))");
    expect(migration).toContain("REVOKE ALL ON TABLE public.search_analytics FROM anon");
  });

  it("remove privilégios herdados e mantém somente leitura e inserção autenticadas", () => {
    expect(grantsMigration).toContain(
      "REVOKE ALL ON TABLE public.search_analytics FROM authenticated",
    );
    expect(grantsMigration).toContain(
      "GRANT SELECT, INSERT ON TABLE public.search_analytics TO authenticated",
    );
  });

  it("consolida a leitura própria e gerencial em uma única policy permissiva", () => {
    expect(selectPolicyMigration).toContain(
      'DROP POLICY IF EXISTS "Users read own search analytics"',
    );
    expect(selectPolicyMigration).toContain(
      'DROP POLICY IF EXISTS "Managers read search analytics"',
    );
    expect(selectPolicyMigration).toContain(
      'CREATE POLICY "Authorized users read search analytics"',
    );
    expect(selectPolicyMigration).toContain("(SELECT auth.uid()) = user_id");
    expect(selectPolicyMigration).toContain("(SELECT public.is_manager_or_admin())");
  });

  it("indexa os dois cursores globais e os dois cursores por proprietário", () => {
    expect(migration).toContain("(created_at DESC, id DESC)");
    expect(migration).toContain("(user_id, created_at DESC, id DESC)");
    expect(migration).toContain("(seller_id, created_at DESC, id DESC)");
    expect(migration).toContain("WHERE results_count = 0");
  });
});
