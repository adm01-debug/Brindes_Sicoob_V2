/**
 * Catraca: autoria da telemetria de busca nunca vem do navegador.
 *
 * Regra travada (originalmente em `tests/scenarios/sql/search-analytics-legacy-compatibility-fixture.sql`,
 * da PR #112, fechada sem merge): em insert legado em `public.search_analytics`,
 * a autoria enviada pelo cliente — canônica (`user_id`) ou legada (`seller_id`),
 * verdadeira ou forjada — é sobrescrita por `auth.uid()`, e o payload legado
 * `filters_used` só alimenta `search_context` quando o canônico não veio e
 * apenas no formato aceito (objeto JSON dentro do limite de tamanho).
 *
 * Por que não o fixture original: ele exige Postgres descartável e um
 * `scripts/qa/simular-*.py` que a `main` não tem (nenhum script consome
 * fixture de search_analytics), e `tests/scenarios/**` está fora do Vitest
 * (`vitest.config.ts:39`). A regra, porém, está viva nas migrations — e o
 * front ainda escreve o payload legado (`src/hooks/useProductAnalytics.ts:50`).
 * Esta suíte trava o contrato no último estado declarado das migrations, de
 * modo que uma migration futura não possa afrouxá-lo em silêncio.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const MIGRATIONS_DIR = "supabase/migrations";
const NORMALIZER = "normalize_search_analytics_insert";
const TRIGGER = "trg_normalize_search_analytics_insert";
const CONTEXT_CHECK = "search_analytics_search_context_valid";

interface Migration {
  name: string;
  sql: string;
}

const MIGRATIONS: Migration[] = readdirSync(MIGRATIONS_DIR)
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map((name) => ({
    name,
    sql: readFileSync(path.join(MIGRATIONS_DIR, name), "utf8"),
  }));

/** Última migration (ordem lexicográfica = ordem de aplicação) que casa com o filtro. */
const lastMigration = (predicate: (sql: string) => boolean): Migration => {
  const found = [...MIGRATIONS].reverse().find((migration) => predicate(migration.sql));
  if (!found) {
    throw new Error("Nenhuma migration satisfaz o filtro: o contrato sumiu da main.");
  }
  return found;
};

/** Migrations aplicadas depois de `name`, onde um afrouxamento posterior apareceria. */
const migrationsAfter = (name: string): Migration[] =>
  MIGRATIONS.filter((migration) => migration.name > name);

const normalizerDefinition = lastMigration((sql) =>
  sql.includes(`CREATE OR REPLACE FUNCTION public.${NORMALIZER}()`),
);

const triggerMigration = lastMigration((sql) => sql.includes(`CREATE TRIGGER ${TRIGGER}`));

const normalizerBody = (() => {
  const body = normalizerDefinition.sql.match(/AS \$function\$([\s\S]*?)\$function\$/)?.[1];
  if (!body) {
    throw new Error(`Corpo de ${NORMALIZER}() não encontrado em ${normalizerDefinition.name}.`);
  }
  return body;
})();

describe("search_analytics — compatibilidade de insert legado", () => {
  it("normalizador sobrescreve user_id e seller_id com auth.uid()", () => {
    expect(normalizerBody).toMatch(/v_actor\s+uuid\s*:=\s*auth\.uid\(\)/);
    expect(normalizerBody).toMatch(/IF\s+v_actor\s+IS\s+NOT\s+NULL\s+THEN/);
    expect(normalizerBody).toMatch(/NEW\.user_id\s*:=\s*v_actor;/);
    expect(normalizerBody).toMatch(/NEW\.seller_id\s*:=\s*v_actor;/);

    const guard = normalizerBody.search(/IF\s+v_actor\s+IS\s+NOT\s+NULL\s+THEN/);
    expect(normalizerBody.search(/NEW\.user_id\s*:=\s*v_actor;/)).toBeGreaterThan(guard);
    expect(normalizerBody.search(/NEW\.seller_id\s*:=\s*v_actor;/)).toBeGreaterThan(guard);
  });

  it("normalizador não preserva autoria enviada pelo cliente", () => {
    // Qualquer COALESCE/`IS NULL` sobre a autoria devolveria ao navegador o
    // poder de carimbar user_id/seller_id de outra pessoa.
    expect(normalizerBody).not.toMatch(/NEW\.(user_id|seller_id)\s+IS\s+NULL/i);
    expect(normalizerBody).not.toMatch(/COALESCE\s*\(\s*NEW\.(user_id|seller_id)/i);
  });

  it("normalizador roda como SECURITY INVOKER com search_path fixado", () => {
    expect(normalizerDefinition.sql).toContain("SECURITY INVOKER");
    expect(normalizerDefinition.sql).toContain("SET search_path = pg_catalog, public");
    expect(normalizerDefinition.sql).toContain(
      `REVOKE ALL ON FUNCTION public.${NORMALIZER}() FROM anon`,
    );
    expect(normalizerDefinition.sql).toContain(
      `REVOKE ALL ON FUNCTION public.${NORMALIZER}() FROM authenticated`,
    );
  });

  it("filters_used só alimenta search_context quando o canônico não veio", () => {
    expect(normalizerBody).toMatch(
      /IF\s+NEW\.search_context\s+IS\s+NULL\s+AND\s+NEW\.filters_used\s+IS\s+NOT\s+NULL\s+THEN\s*NEW\.search_context\s*:=\s*NEW\.filters_used::text;/,
    );
  });

  it("trigger BEFORE INSERT continua ativo e nenhuma migration posterior o derruba", () => {
    expect(triggerMigration.sql.lastIndexOf(`CREATE TRIGGER ${TRIGGER}`)).toBeGreaterThan(
      triggerMigration.sql.lastIndexOf(`DROP TRIGGER IF EXISTS ${TRIGGER}`),
    );
    expect(triggerMigration.sql).toMatch(
      new RegExp(
        `CREATE TRIGGER ${TRIGGER}\\s*BEFORE INSERT ON public\\.search_analytics\\s*FOR EACH ROW\\s*EXECUTE FUNCTION public\\.${NORMALIZER}\\(\\)`,
      ),
    );

    for (const migration of migrationsAfter(triggerMigration.name)) {
      expect(migration.sql).not.toMatch(new RegExp(`DISABLE TRIGGER ${TRIGGER}`));
      expect(migration.sql).not.toMatch(new RegExp(`DROP FUNCTION[^;]*${NORMALIZER}`));
    }
  });

  it("search_context aceita apenas objeto JSON dentro do limite", () => {
    const checkMigration = lastMigration((sql) =>
      sql.includes(`ADD CONSTRAINT ${CONTEXT_CHECK}`),
    );
    expect(checkMigration.sql).toContain("search_context IS JSON OBJECT");
    expect(checkMigration.sql).toContain("octet_length(search_context) <= 32768");
    expect(checkMigration.sql).toContain(`VALIDATE CONSTRAINT ${CONTEXT_CHECK}`);

    for (const migration of migrationsAfter(checkMigration.name)) {
      expect(migration.sql).not.toContain(`DROP CONSTRAINT IF EXISTS ${CONTEXT_CHECK}`);
      expect(migration.sql).not.toContain(`DROP CONSTRAINT ${CONTEXT_CHECK}`);
    }
  });

  it("enquanto o front enviar payload legado, a compatibilidade não pode sumir", () => {
    const hook = readFileSync("src/hooks/useProductAnalytics.ts", "utf8");
    const enviaLegado = /insert\(\{[\s\S]*?(seller_id|filters_used)[\s\S]*?\}\)/.test(hook);

    if (enviaLegado) {
      expect(triggerMigration.sql).toContain(`CREATE TRIGGER ${TRIGGER}`);
      expect(normalizerBody).toMatch(/NEW\.seller_id\s*:=\s*v_actor;/);
    } else {
      // Front migrado para o canônico: o insert precisa carimbar search_context.
      expect(hook).toMatch(/search_context/);
    }
  });
});
