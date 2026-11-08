#!/usr/bin/env node
/**
 * db-performance-audit.mjs
 * ----------------------------------------------------------------
 * Gate de CI: roda EXPLAIN ANALYZE nas tabelas principais via RPC
 * `inspect_query_plan` do Supabase.
 *
 * Saída:
 *  - exit 0 → ok (todas as tabelas explicadas).
 *  - exit 1 → alguma tabela falhou ao explicar.
 *  - exit 2 → erro de configuração.
 */
import { createClient } from '@supabase/supabase-js';

const isCI = process.env.CI === "true" || process.env.CI === "1";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios');
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TABLES_TO_EXPLAIN = [
  'quotes',
  'quote_items',
  'orders',
  'order_items',
  'profiles',
  'workspace_notifications'
];

async function runExplain() {
  console.log('--- 📊 AUDITORIA DE PERFORMANCE DO BANCO (EXPLAIN ANALYZE) ---');
  let failures = 0;

  for (const table of TABLES_TO_EXPLAIN) {
    console.log(`\nTabela: ${table}`);
    try {
      const { data, error } = await supabase.rpc('inspect_query_plan', {
        p_query: `SELECT * FROM ${table} LIMIT 100`
      });

      if (error) {
        failures++;
        console.error(`❌ Erro ao explicar ${table}: ${error.message}`);
        if (isCI) console.log(`::error file=db-performance-audit.mjs,title=EXPLAIN falhou::${table}: ${error.message}`);
      } else {
        console.log(data);
      }
    } catch (err) {
      failures++;
      console.error(`❌ Erro inesperado em ${table}: ${err instanceof Error ? err.message : String(err)}`);
      if (isCI) console.log(`::error file=db-performance-audit.mjs,title=EXPLAIN inesperado::${table}`);
    }
  }

  if (failures > 0) {
    console.error(`\n❌ ${failures} de ${TABLES_TO_EXPLAIN.length} tabelas falharam no EXPLAIN.`);
    process.exit(1);
  }
  console.log(`\n✅ ${TABLES_TO_EXPLAIN.length} tabelas explicadas com sucesso.`);
  process.exit(0);
}

runExplain().catch((error) => {
  console.error('❌ Falha inesperada no gate: ' + (error instanceof Error ? error.message : String(error)));
  process.exit(2);
});