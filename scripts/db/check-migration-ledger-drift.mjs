#!/usr/bin/env node
// Reconciliação bidirecional; nunca aplica arquivos nem repara o ledger.
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { createSupabaseSqlClient } from './supabase-sql-client.mjs';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PROJECT_REF = 'cfmzkthhgliqelozlmwu';
const hash = value => createHash('sha256').update(value).digest('hex');

// Preserva literais e corpos SQL; diferenças normalizadas exigem revisão,
// não significam necessariamente divergência semântica.
export function normalizedSql(sql) {
  const tokens = sql.match(/\$([A-Za-z_][\w]*|)\$[\s\S]*?\$\1\$|'(?:''|[^'])*'|"(?:""|[^"])*"|--[^\n]*|\/\*[\s\S]*?\*\/|[\w$]+|[^\s]/g) ?? [];
  return tokens.filter(t => !t.startsWith('--') && !t.startsWith('/*')).join(' ').replace(/(?:\s*;)+\s*$/, '');
}
export function collectLocalMigrations(root = ROOT) {
  const files = [];
  function walk(dir, archived) {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, item.name);
      if (item.isDirectory()) { walk(full, archived); continue; }
      const match = /^(\d+)_(.+)\.sql$/.exec(item.name);
      if (!match) continue;
      const sql = readFileSync(full, 'utf8');
      files.push({ version: match[1], name: match[2], path: relative(root, full), archived,
        sha256: hash(sql), normalized_sha256: hash(normalizedSql(sql)) });
    }
  }
  for (const [dir, archived] of [['migrations', false], ['migrations_archive', true]]) {
    try { walk(join(root, 'supabase', dir), archived); }
    catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
  return files;
}
export function compareLedger(local, ledger) {
  const results = [];
  const applied = new Set(ledger.map(r => r.version));
  for (const row of ledger) {
    const candidates = local.filter(f => f.version === row.version);
    const active = candidates.filter(f => !f.archived);
    if (!candidates.length) { results.push({ version: row.version, status: 'remota_sem_arquivo' }); continue; }
    if (active.length > 1) { results.push({ version: row.version, status: 'versao_ativa_duplicada' }); continue; }
    const file = active[0] ?? candidates[0];
    const sql = Array.isArray(row.statements) ? row.statements.map(s => s.trim().replace(/;\s*$/, '')).join(';\n') : null;
    const remoteHash = sql === null ? null : hash(normalizedSql(sql));
    results.push({ version: row.version, path: file.path, archived: file.archived,
      local_sha256: file.sha256, remote_normalized_sha256: remoteHash,
      status: remoteHash === null ? 'conteudo_nao_verificado' : remoteHash !== file.normalized_sha256 ? 'conteudo_divergente' :
        row.name !== file.name ? 'nome_divergente' : file.archived ? 'aplicada_arquivada' : 'alinhada' });
  }
  for (const file of local) {
    if (!applied.has(file.version)) results.push({ version: file.version, path: file.path,
      status: file.archived ? 'arquivada_sem_ledger' : 'local_sem_ledger' });
  }
  const counts = new Map();
  for (const f of local.filter(f => !f.archived)) counts.set(f.version, (counts.get(f.version) ?? 0) + 1);
  for (const [version, count] of counts) {
    if (count > 1 && !results.some(r => r.version === version && r.status === 'versao_ativa_duplicada')) {
      results.push({ version, status: 'versao_ativa_duplicada' });
    }
  }
  return results;
}
async function fetchLedger() {
  const client = await createSupabaseSqlClient({
    projectRef: PROJECT_REF,
    readOnly: true,
    applicationName: 'sicoob-auditoria-ledger',
  });
  await client.connect();
  try {
    if (client.transport === 'postgres') {
      await client.query('BEGIN READ ONLY');
      await client.query("SET LOCAL statement_timeout = '30s'");
    }
    const { rows } = await client.query('SELECT version, name, statements FROM supabase_migrations.schema_migrations ORDER BY version');
    if (client.transport === 'postgres') await client.query('ROLLBACK');
    return rows;
  } finally { await client.end(); }
}
async function main() {
  const args = process.argv.slice(2), index = args.indexOf('--ledger-file');
  const ledger = index < 0 ? await fetchLedger() : JSON.parse(readFileSync(args[index + 1], 'utf8'));
  if (!Array.isArray(ledger) || ledger.some(r => typeof r.version !== 'string')) throw new Error('Ledger inválido.');
  const local = collectLocalMigrations(), results = compareLedger(local, ledger);
  const pending = results.filter(r => !['alinhada', 'arquivada_sem_ledger'].includes(r.status));
  const summary = { source: index < 0 ? 'PostgreSQL atual, somente leitura' : 'arquivo offline; não comprova estado remoto',
    ledger_count: ledger.length, local_count: local.length, pending_count: pending.length, results };
  if (args.includes('--json')) console.log(JSON.stringify(summary, null, 2));
  else {
    console.log(`Ledger: ${ledger.length}; arquivos: ${local.length}; pendências: ${pending.length}.`);
    for (const r of pending) console.log(`${r.version}: ${r.status}${r.path ? ' — ' + r.path : ''}`);
    console.log('Diferenças exigem revisão; não aplique automaticamente arquivos ausentes do ledger.');
  }
  process.exitCode = pending.length ? 1 : 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(e => { console.error(`[ledger] Verificação indisponível (${e.code ?? e.name}); nenhum resultado aprovado.`); process.exitCode = 2; });
}
