#!/usr/bin/env node
/**
 * check-migration-ledger-drift.mjs
 *
 * Compara `supabase_migrations.schema_migrations` (o ledger remoto) contra
 * os arquivos locais em supabase/migrations/ e supabase/migrations_archive/.
 *
 * Por quê existe: em 17/09/2026 a migration `20260915143442_sicoob_reconciliation_baseline`
 * ficou registrada como aplicada no banco por dias sem NENHUM arquivo local
 * com esse timestamp em qualquer branch — o baseline mais crítico do projeto
 * sem fonte rastreável no repositório. Ver docs/plano-implementacao/
 * plano-correcoes-auditoria-50-etapas-20260917.md, Etapas 5-8 e 29.
 *
 * Importante — o que este script NÃO verifica: este projeto tem, por
 * desenho documentado (mesmo plano, Fase B), 489 arquivos locais e só 22
 * no ledger — a maioria dos arquivos locais nunca aplicados é ESPERADO
 * (schema aplicado via MCP, documentado como as-built depois, ou migration
 * legada/nunca-aplicada ainda não classificada pela Etapa 9 do plano
 * principal). Este script SÓ alerta a direção perigosa: versão no ledger
 * remoto sem NENHUM arquivo local correspondente — banco com mudança de
 * schema sem rastro nenhum no Git. A direção oposta (arquivo sem ledger)
 * não é reportada aqui de propósito.
 *
 * Pré-requisito não resolvido nesta sessão: precisa do pacote `pg` como
 * dependência (não está em package.json ainda) e da variável de ambiente
 * `SUPABASE_DB_URL` (connection string direta ao Postgres, não a API REST)
 * cadastrada como secret do GitHub Actions no environment apropriado —
 * ver Etapa 3 do plano principal (`docs/plano-implementacao/
 * plano-reconciliacao-50-etapas.md`), que já previa esse cadastro e ainda
 * não foi executada. Sem isso, o job do workflow falha na instalação/
 * conexão, não silenciosamente — não decidi sozinho adicionar a dependência
 * nem o secret.
 *
 * Uso: SUPABASE_DB_URL=postgres://... node scripts/db/check-migration-ledger-drift.mjs
 */

import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

const MIGRATION_DIRS = [
  join(ROOT, 'supabase', 'migrations'),
  join(ROOT, 'supabase', 'migrations_archive'),
];

const VERSION_RE = /^(\d{3}|\d{14})_/;

function collectLocalVersions() {
  const versions = new Set();
  function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith('.sql')) continue;
      const m = entry.name.match(VERSION_RE);
      if (m) versions.add(m[1]);
    }
  }
  for (const d of MIGRATION_DIRS) walk(d);
  return versions;
}

async function fetchLedgerVersions() {
  const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error(
      '[check-migration-ledger-drift] SUPABASE_DB_URL (ou DATABASE_URL) não definida — ' +
        'não é possível consultar o ledger remoto. Ver comentário no topo deste arquivo.'
    );
    process.exit(2);
  }

  let Client;
  try {
    ({ Client } = await import('pg'));
  } catch {
    console.error(
      "[check-migration-ledger-drift] pacote 'pg' não instalado — adicione como devDependency " +
        "antes de usar este script em CI (ver comentário no topo deste arquivo)."
    );
    process.exit(2);
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const { rows } = await client.query(
      'select version from supabase_migrations.schema_migrations order by version'
    );
    return rows.map((r) => r.version);
  } finally {
    await client.end();
  }
}

async function main() {
  const jsonOutput = process.argv.includes('--json');
  const localVersions = collectLocalVersions();
  const ledgerVersions = await fetchLedgerVersions();

  const orphanVersions = ledgerVersions.filter((v) => !localVersions.has(v));

  if (jsonOutput) {
    console.log(JSON.stringify({ ledger_count: ledgerVersions.length, local_count: localVersions.size, orphan_versions: orphanVersions }, null, 2));
  } else {
    console.log(
      `[check-migration-ledger-drift] ${ledgerVersions.length} versões no ledger remoto · ${localVersions.size} versões locais (migrations + migrations_archive)`
    );
    if (orphanVersions.length) {
      console.log(
        `\n${orphanVersions.length} versão(ões) aplicada(s) no banco SEM arquivo local correspondente:`
      );
      for (const v of orphanVersions) console.log(`  ${v}`);
    } else {
      console.log('\n0 versões órfãs — todo registro do ledger tem arquivo local rastreável.');
    }
  }

  process.exit(orphanVersions.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('[check-migration-ledger-drift] erro inesperado:', err.message);
  process.exit(2);
});
