// Executado pelo node:test. Precisa de um PostgreSQL descartável em SICOOB_TEST_DATABASE_URL;
// sem a variável os casos são pulados, para não exigir servidor de banco no runner padrão.
//
// Cobre a migration 20261125193000_revoke_execute_legacy_notification_helpers.sql:
// as duas assinaturas de is_dnd_active, a helper de limpeza, a idempotência e o Down
// documentado no corpo da migration (exigência do CONTRIBUTING: "toda migration deve
// ser testada para reversão").
import assert from "node:assert/strict";
import test from "node:test";
import { loadAuthorizedTargets } from "../../scripts/db/apply-sicoob-migrations.mjs";

const databaseUrl = process.env.SICOOB_TEST_DATABASE_URL;
const VERSION = "20261125193000";
const MIGRATION = loadAuthorizedTargets().find((target) => target.version === VERSION);
assert.ok(MIGRATION, `migration ${VERSION} ausente da allowlist de aplicação`);

const DOWN = `
  GRANT EXECUTE ON FUNCTION public.cleanup_old_notifications() TO PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.is_dnd_active(uuid) TO PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.is_dnd_active() TO PUBLIC, anon;
`;

const ACL_LEGADA = `
  CREATE FUNCTION public.cleanup_old_notifications() RETURNS VOID
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN NULL; END $$;
  CREATE FUNCTION public.is_dnd_active(p_user_id uuid) RETURNS boolean
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN RETURN false; END $$;
  CREATE FUNCTION public.is_dnd_active() RETURNS boolean
  LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$ BEGIN RETURN false; END $$;
  GRANT EXECUTE ON FUNCTION public.cleanup_old_notifications() TO anon;
  GRANT EXECUTE ON FUNCTION public.is_dnd_active(uuid) TO anon;
  GRANT EXECUTE ON FUNCTION public.is_dnd_active() TO authenticated;
`;

async function carregarCliente() {
  const { default: pg } = await import("pg");
  return pg.Client;
}

async function comBancoDescartavel(executar) {
  const Client = await carregarCliente();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
      END $$;
    `);
    await client.query("DROP FUNCTION IF EXISTS public.cleanup_old_notifications()");
    await client.query("DROP FUNCTION IF EXISTS public.is_dnd_active(uuid)");
    await client.query("DROP FUNCTION IF EXISTS public.is_dnd_active()");
    await client.query(ACL_LEGADA);
    await executar(client);
  } finally {
    await client.query("DROP FUNCTION IF EXISTS public.cleanup_old_notifications()").catch(() => {});
    await client.query("DROP FUNCTION IF EXISTS public.is_dnd_active(uuid)").catch(() => {});
    await client.query("DROP FUNCTION IF EXISTS public.is_dnd_active()").catch(() => {});
    await client.end();
  }
}

// anon/authenticated/service_role via has_function_privilege; PUBLIC via aclexplode
// (PUBLIC não é papel, não pode ir em has_function_privilege).
async function aclEfetiva(client) {
  const { rows } = await client.query(`
    SELECT p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS assinatura,
           has_function_privilege('anon', p.oid, 'EXECUTE') AS anon,
           has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated,
           has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role,
           EXISTS (
             SELECT 1
             FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
             WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE'
           ) AS public
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN ('cleanup_old_notifications', 'is_dnd_active')
     ORDER BY 1
  `);
  return new Map(rows.map((row) => [row.assinatura, row]));
}

test("fecha anon/PUBLIC nas helpers e mantém as assinaturas consumidas", async (t) => {
  if (!databaseUrl) return t.skip("SICOOB_TEST_DATABASE_URL ausente");
  await comBancoDescartavel(async (client) => {
    const antes = await aclEfetiva(client);
    assert.equal(antes.size, 3, "as três assinaturas legadas devem existir no cenário");

    await client.query(MIGRATION.sql);

    const depois = await aclEfetiva(client);
    for (const [assinatura, linha] of depois) {
      assert.equal(linha.anon, false, `anon ainda executa ${assinatura}`);
      assert.equal(linha.public, false, `PUBLIC ainda executa ${assinatura}`);
      assert.equal(linha.service_role, true, `service_role perdeu EXECUTE em ${assinatura}`);
    }
    assert.equal(depois.get("is_dnd_active()").authenticated, true,
      "is_dnd_active() é RPC revisada do frontend e precisa manter authenticated");
    assert.equal(depois.get("is_dnd_active(p_user_id uuid)").authenticated, false,
      "a sobrecarga legada com user_id não pode continuar em authenticated");
    assert.equal(depois.get("cleanup_old_notifications()").authenticated, false);
  });
});

test("reaplicação é idempotente e o Down documentado devolve a ACL anterior", async (t) => {
  if (!databaseUrl) return t.skip("SICOOB_TEST_DATABASE_URL ausente");
  await comBancoDescartavel(async (client) => {
    await client.query(MIGRATION.sql);
    await client.query(MIGRATION.sql);

    await client.query(DOWN);

    const revertido = await aclEfetiva(client);
    for (const [assinatura, linha] of revertido) {
      assert.equal(linha.anon, true, `o Down não devolveu anon em ${assinatura}`);
      assert.equal(linha.public, true, `o Down não devolveu PUBLIC em ${assinatura}`);
    }
  });
});

function extrairAssercao(sql) {
  const inicio = sql.indexOf("DO $sicoob_acl_assert$");
  assert.notEqual(inicio, -1, "asserção de ACL ausente na migration");
  const marcador = "$sicoob_acl_assert$;";
  const fim = sql.indexOf(marcador, inicio) + marcador.length;
  return sql.slice(inicio, fim);
}

test("vazamento reintroduzido derruba o lote atômico com o nome da assinatura", async (t) => {
  if (!databaseUrl) return t.skip("SICOOB_TEST_DATABASE_URL ausente");
  await comBancoDescartavel(async (client) => {
    await client.query(MIGRATION.sql);
    // Simula o caso em que o REVOKE não surte efeito (grant explícito posterior).
    await client.query("GRANT EXECUTE ON FUNCTION public.is_dnd_active(uuid) TO anon");
    await assert.rejects(
      client.query(extrairAssercao(MIGRATION.sql)),
      /ACL de helper de notificacao ainda exposta: public.is_dnd_active\(p_user_id uuid\)/,
    );
  });
});
