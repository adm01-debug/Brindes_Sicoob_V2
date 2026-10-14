/**
 * P0 — RLS e integridade de dados.
 *
 * Cobre cenários classificados como P0 ("dados corrompidos / vazamento") no RUNBOOK.
 * Os contratos que já têm simulação PostgreSQL ou gate estático verificam que a
 * evidência executável continua ligada ao CI. Casos dependentes de ambientes
 * externos permanecem explicitamente ignorados, sem contar como sucesso.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = (path: string) => readFileSync(path, "utf8");

describe("P0 — RLS e integridade", () => {
  // ─── user_roles (privilege escalation) ────────────────────────────────
  it("user_roles: mantém gate executável contra autoelevação", () => {
    const gate = source("tests/rls/critical-tables-rls.test.ts");
    expect(gate).toContain("privilege escalation is blocked");
    expect(gate).toContain("user_roles has no user-facing write policies");
  });

  it("user_roles: persona anônima tem teste remoto condicional explícito", () => {
    expect(source("tests/rls/personas.test.ts")).toContain("cannot SELECT user_roles");
  });

  // ─── quotes ───────────────────────────────────────────────────────────
  it("quotes: isolamento do vendedor permanece no gate de policies", () => {
    const gate = source("tests/security/rls-seller-policies.spec.ts");
    expect(gate).toContain("INSERT em quotes/orders sempre exige seller_id = auth.uid()");
    expect(gate).toContain("UPDATE em quotes/orders aplica check de seller_id");
  });

  it("quotes: aprovação pública executa simulação PostgreSQL no CI", () => {
    const workflow = source(".github/workflows/ci.yml");
    const simulation = source("scripts/qa/simular-aprovacao-publica.py");
    expect(workflow).toContain("python3 scripts/qa/simular-aprovacao-publica.py");
    expect(simulation).toContain("token_alheio_antigo_nao_expoe_orcamento");
    expect(simulation).toContain("anon_sem_acesso_direto");
  });

  // ─── orders / carts ───────────────────────────────────────────────────
  it("orders: contrato anônimo permanece no gate das tabelas críticas", () => {
    const gate = source("tests/rls/critical-tables-rls.test.ts");
    expect(gate).toMatch(/orders[\s\S]+anon/i);
  });

  it("seller_carts: isola leitura e escrita pelo seller autenticado", () => {
    const policy = source("supabase/migrations/20260306013723_8ea96e6d-f69b-4bc3-80bc-109377e45a2d.sql");

    expect(policy).toContain('CREATE POLICY "Users can manage own carts"');
    expect(policy).toMatch(/ON public\.seller_carts FOR ALL\s+TO authenticated/);
    expect(policy).toContain("USING (seller_id = auth.uid())");
    expect(policy).toContain("WITH CHECK (seller_id = auth.uid())");
  });

  // ─── companies (CRM) ──────────────────────────────────────────────────
  it("companies (external): bridge exige identidade antes de expor dados", () => {
    const bridge = source("supabase/functions/external-db-bridge/index.ts");
    const crud = bridge.slice(bridge.indexOf("async function handleCrud"));
    const userGate = crud.indexOf("const userId = actor?.user.id");
    const databaseAccess = crud.indexOf("const externalSupabase = await getExternalClient");

    expect(crud).toContain("COMPANY_TABLES");
    expect(crud).toContain("if (!userId) return jsonResponse({ error: 'Autenticação necessária' }, 401");
    expect(userGate).toBeGreaterThan(-1);
    expect(databaseAccess).toBeGreaterThan(userGate);
  });

  // ─── mcp_keys (segurança crítica) ─────────────────────────────────────
  it("mcp_keys: persiste somente hash e a emissão não seleciona o segredo", () => {
    const schema = source("supabase/migrations/20260419130037_5f01e5dd-e3d5-4d26-8a08-328d432a05aa.sql");
    const issue = source("supabase/functions/mcp-keys-issue/index.ts");

    expect(schema).toMatch(/key_hash text NOT NULL UNIQUE/);
    expect(schema).not.toMatch(/\bsecret_key\b/);
    expect(issue).toContain("key_hash: hash");
    expect(issue).toContain('.select("id, key_prefix, scopes, expires_at, created_at")');
    expect(issue).not.toMatch(/\.select\([^)]*key_hash/);
  });

  it("mcp_keys: revoga chave full quando o emissor perde o papel dev", () => {
    const revocation = source("supabase/migrations/20260426122751_c0bc82e4-dc78-47da-8da4-74691b181d3d.sql");
    const validation = source("supabase/migrations/20260426123111_389cc935-b988-47b5-8296-1d3a8214ece2.sql");

    expect(revocation).toContain("AFTER DELETE ON public.user_roles");
    expect(revocation).toContain("AND role = 'dev'::app_role");
    expect(revocation).toContain("AND '*' = ANY(scopes)");
    expect(revocation).toContain("'creator_lost_dev_role'");
    expect(revocation).toContain("'*/15 * * * *'");
    expect(validation).toContain("'grantor_lost_dev_at_use'");
    expect(validation).toContain("'grantor_lost_dev'::text");
  });

  it("mcp_keys: rejeição anônima não aguarda a telemetria do banco", () => {
    for (const name of ["issue", "revoke", "rotate", "update"]) {
      const worker = source(`supabase/functions/mcp-keys-${name}/index.ts`);
      const missingJwtPath = worker.slice(
        worker.indexOf("if (!jwt)"),
        worker.indexOf("const userClient", worker.indexOf("if (!jwt)")),
      );

      expect(worker).toContain('import { deferBackgroundTask } from "../_shared/background-task.ts"');
      expect(missingJwtPath).toContain("deferBackgroundTask(");
      expect(missingJwtPath).not.toContain("await auditFailure");
      expect(missingJwtPath).toContain("401");
    }
  });

  it("edges técnicas rejeitam antes de depender de telemetria persistida", () => {
    const secrets = source("supabase/functions/secrets-manager/index.ts");
    const inspect = source("supabase/functions/external-db-inspect/index.ts");

    expect(secrets).toContain("deferBackgroundTask(");
    expect(secrets).toContain('"secrets-manager:missing-token"');
    expect(inspect.indexOf("await authorize(req")).toBeLessThan(
      inspect.indexOf("await runBotProtection(req"),
    );
  });

  // ─── workspace_notifications ──────────────────────────────────────────
  it("workspace_notifications: usuário só lê e altera notificações próprias", () => {
    const policy = source("supabase/migrations/20260503151554_c98e739b-b86f-42f6-9afa-19f4c8243298.sql");

    expect(policy).toContain("ALTER TABLE public.workspace_notifications ENABLE ROW LEVEL SECURITY");
    expect(policy).toMatch(/FOR SELECT\s+USING \(auth\.uid\(\) = user_id\)/);
    expect(policy).toMatch(/FOR UPDATE\s+USING \(auth\.uid\(\) = user_id\)/);
    expect(policy).toMatch(/FOR DELETE\s+USING \(auth\.uid\(\) = user_id\)/);
  });

  // ─── realtime ──────────────────────────────────────────────────────────
  it("realtime: leitura e broadcast exigem tópico do próprio usuário", () => {
    const policy = source("supabase/migrations/20260417001408_df418063-07d5-4aaf-938b-c3e01a5653fb.sql");
    const ownTopic = "realtime.topic() LIKE ('user:' || auth.uid()::text || '%')";

    expect(policy).toContain("ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY");
    expect(policy).toContain('CREATE POLICY "authenticated can read own topic"');
    expect(policy).toContain('CREATE POLICY "authenticated can broadcast own topic"');
    expect(policy.match(new RegExp(ownTopic.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))).toHaveLength(2);
  });

  // ─── Integridade transacional ─────────────────────────────────────────
  it("orçamento aprovado → pedido: simulação de atomicidade está ligada ao CI", () => {
    const workflow = source(".github/workflows/ci.yml");
    const simulation = source("scripts/qa/simular-conversao-pedido-sicoob.py");
    expect(workflow).toContain("python3 scripts/qa/simular-conversao-pedido-sicoob.py");
    expect(simulation).toContain("rollback");
  });

  it("ownership-repair: dry-run evita mutações e exige admin/dev antes da RPC", () => {
    const migration = source("supabase/migrations/20260426145642_948756c0-6c4a-4be4-8757-9533bd4e291a.sql");
    const worker = source("supabase/functions/ownership-repair/index.ts");

    expect(migration).toContain("IF NOT _dry_run THEN");
    expect(migration).toContain("INSERT INTO public.ownership_repair_logs");
    expect(migration).toContain("dry_run, triggered_by, triggered_by_label");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.repair_ownership_orphans");
    expect(worker).toContain("const dryRun = body.dry_run !== false");
    expect(worker).toContain('authorize(req, { requireRole: "supervisor", enforceServerSide: true })');
    expect(worker).toContain('.in("role", ["admin", "dev"])');
    expect(worker).toContain('return json({ error: "forbidden" }, 403)');
  });
});
