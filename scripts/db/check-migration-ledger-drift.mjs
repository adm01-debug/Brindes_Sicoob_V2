#!/usr/bin/env node
// Reconciliação bidirecional; nunca aplica arquivos nem repara o ledger.
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { createSupabaseSqlClient } from './supabase-sql-client.mjs';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PROJECT_REF = 'cfmzkthhgliqelozlmwu';
const hash = (value) => createHash('sha256').update(value).digest('hex');
const ACCEPTED_STATUSES = new Set(['alinhada', 'aplicada_arquivada', 'arquivada_sem_ledger']);
const LEDGER_HASH_MARKER = /^sha256:([a-f0-9]{64}); executor:allowlisted-management-api$/;

// Preserva literais e corpos SQL; diferenças normalizadas exigem revisão,
// não significam necessariamente divergência semântica.
export function normalizedSql(sql) {
  const tokens =
    sql.match(
      /\$([A-Za-z_][\w]*|)\$[\s\S]*?\$\1\$|'(?:''|[^'])*'|"(?:""|[^"])*"|--[^\n]*|\/\*[\s\S]*?\*\/|[\w$]+|[^\s]/g,
    ) ?? [];
  return tokens
    .filter((t) => !t.startsWith('--') && !t.startsWith('/*'))
    .join(' ')
    .replace(/(?:\s*;)+\s*$/, '');
}
export function collectLocalMigrations(root = ROOT) {
  const files = [];
  function walk(dir, archived) {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, item.name);
      if (item.isDirectory()) {
        walk(full, archived);
        continue;
      }
      const match = /^(\d+)_(.+)\.sql$/.exec(item.name);
      if (!match) continue;
      const sql = readFileSync(full, 'utf8');
      files.push({
        version: match[1],
        name: match[2],
        path: relative(root, full),
        archived,
        sha256: hash(sql),
        normalized_sha256: hash(normalizedSql(sql)),
      });
    }
  }
  for (const [dir, archived] of [
    ['migrations', false],
    ['migrations_archive', true],
  ]) {
    try {
      walk(join(root, 'supabase', dir), archived);
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
  }
  return files;
}
export function compareLedger(local, ledger) {
  const results = [];
  const applied = new Set(ledger.map((r) => r.version));
  for (const row of ledger) {
    const candidates = local.filter((f) => f.version === row.version);
    const active = candidates.filter((f) => !f.archived);
    if (!candidates.length) {
      results.push({ version: row.version, status: 'remota_sem_arquivo' });
      continue;
    }
    if (active.length > 1) {
      results.push({ version: row.version, status: 'versao_ativa_duplicada' });
      continue;
    }
    const file = active[0] ?? candidates[0];
    const sql = Array.isArray(row.statements)
      ? row.statements.map((s) => s.trim().replace(/;\s*$/, '')).join(';\n')
      : null;
    const hashMarker =
      row.statements?.length === 1 ? LEDGER_HASH_MARKER.exec(row.statements[0]?.trim()) : null;
    const remoteHash = hashMarker?.[1] ?? (sql === null ? null : hash(normalizedSql(sql)));
    const hashesMatch = hashMarker
      ? remoteHash === file.sha256
      : remoteHash === file.normalized_sha256;
    results.push({
      version: row.version,
      path: file.path,
      archived: file.archived,
      local_sha256: file.sha256,
      remote_normalized_sha256: remoteHash,
      status:
        remoteHash === null
          ? 'conteudo_nao_verificado'
          : !hashesMatch
            ? 'conteudo_divergente'
            : row.name !== file.name
              ? 'nome_divergente'
              : file.archived
                ? 'aplicada_arquivada'
                : 'alinhada',
    });
  }
  for (const file of local) {
    if (!applied.has(file.version))
      results.push({
        version: file.version,
        path: file.path,
        status: file.archived ? 'arquivada_sem_ledger' : 'local_sem_ledger',
      });
  }
  const counts = new Map();
  for (const f of local.filter((f) => !f.archived))
    counts.set(f.version, (counts.get(f.version) ?? 0) + 1);
  for (const [version, count] of counts) {
    if (
      count > 1 &&
      !results.some((r) => r.version === version && r.status === 'versao_ativa_duplicada')
    ) {
      results.push({ version, status: 'versao_ativa_duplicada' });
    }
  }
  return results;
}

function findingFingerprint(finding) {
  return JSON.stringify({
    version: finding.version,
    status: finding.status,
    path: finding.path ?? null,
    archived: finding.archived ?? false,
    local_sha256: finding.local_sha256 ?? null,
    remote_normalized_sha256: finding.remote_normalized_sha256 ?? null,
  });
}

function findingDigest(finding) {
  return hash(findingFingerprint(finding));
}

function normalizeBaselineFindings(baselineFindings) {
  if (Array.isArray(baselineFindings)) {
    return baselineFindings.map((finding) => ({
      version: finding.version,
      fingerprint: finding.fingerprint ?? findingDigest(finding),
    }));
  }
  return Object.entries(baselineFindings ?? {}).map(([version, fingerprint]) => ({
    version,
    fingerprint,
  }));
}

export function comparePendingBaseline(results, baselineFindings) {
  const pending = results.filter((result) => !ACCEPTED_STATUSES.has(result.status));
  const expected = normalizeBaselineFindings(baselineFindings);
  const expectedFingerprints = new Set(expected.map((finding) => finding.fingerprint));
  const currentFingerprints = new Set(pending.map(findingDigest));
  const unexpected = pending.filter((finding) => !expectedFingerprints.has(findingDigest(finding)));
  const missingExpected = expected.filter(
    (finding) => !currentFingerprints.has(finding.fingerprint),
  );
  const invalidResolutions = missingExpected.filter((expected) => {
    const sameVersion = results.filter((result) => result.version === expected.version);
    return !sameVersion.some((result) => ACCEPTED_STATUSES.has(result.status));
  });
  const resolved = missingExpected.filter((expected) => !invalidResolutions.includes(expected));
  return {
    expected_count: expected.length,
    pending,
    unexpected,
    resolved,
    invalid_resolutions: invalidResolutions,
  };
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
    const { rows } = await client.query(
      'SELECT version, name, statements FROM supabase_migrations.schema_migrations ORDER BY version',
    );
    if (client.transport === 'postgres') await client.query('ROLLBACK');
    return rows;
  } finally {
    await client.end();
  }
}
async function main() {
  const args = process.argv.slice(2);
  const ledgerIndex = args.indexOf('--ledger-file');
  const baselineIndex = args.indexOf('--baseline-file');
  const ledger =
    ledgerIndex < 0 ? await fetchLedger() : JSON.parse(readFileSync(args[ledgerIndex + 1], 'utf8'));
  if (!Array.isArray(ledger) || ledger.some((r) => typeof r.version !== 'string'))
    throw new Error('Ledger inválido.');
  const local = collectLocalMigrations(),
    results = compareLedger(local, ledger);
  const pending = results.filter((result) => !ACCEPTED_STATUSES.has(result.status));
  let baselineComparison = null;
  if (baselineIndex >= 0) {
    const baseline = JSON.parse(readFileSync(args[baselineIndex + 1], 'utf8'));
    if (
      baseline?.project_ref !== PROJECT_REF ||
      (!Array.isArray(baseline?.findings) && typeof baseline?.fingerprints !== 'object')
    ) {
      throw new Error('Baseline do ledger inválido ou de outro projeto.');
    }
    baselineComparison = comparePendingBaseline(
      results,
      baseline.findings ?? baseline.fingerprints,
    );
  }
  const summary = {
    source:
      ledgerIndex < 0
        ? 'PostgreSQL atual, somente leitura'
        : 'arquivo offline; não comprova estado remoto',
    project_ref: PROJECT_REF,
    ledger_count: ledger.length,
    local_count: local.length,
    pending_count: pending.length,
    baseline: baselineComparison && {
      expected_count: baselineComparison.expected_count,
      unexpected_count: baselineComparison.unexpected.length,
      resolved_count: baselineComparison.resolved.length,
      invalid_resolution_count: baselineComparison.invalid_resolutions.length,
      unexpected: baselineComparison.unexpected,
      resolved: baselineComparison.resolved,
      invalid_resolutions: baselineComparison.invalid_resolutions,
    },
    results,
  };
  if (args.includes('--json')) console.log(JSON.stringify(summary, null, 2));
  else {
    console.log(
      `Ledger: ${ledger.length}; arquivos: ${local.length}; pendências: ${pending.length}.`,
    );
    if (baselineComparison) {
      console.log(
        `Baseline revisada: ${baselineComparison.unexpected.length} nova(s), ${baselineComparison.resolved.length} resolvida(s), ${baselineComparison.invalid_resolutions.length} resolução(ões) inválida(s).`,
      );
      for (const result of [
        ...baselineComparison.unexpected,
        ...baselineComparison.invalid_resolutions,
      ]) {
        console.log(`${result.version}: ${result.status}${result.path ? ' — ' + result.path : ''}`);
      }
      console.log(
        'O passivo histórico conhecido não é reaplicado nem inserido artificialmente no ledger.',
      );
    } else {
      for (const result of pending) {
        console.log(`${result.version}: ${result.status}${result.path ? ' — ' + result.path : ''}`);
      }
      console.log(
        'Diferenças exigem revisão; não aplique automaticamente arquivos ausentes do ledger.',
      );
    }
  }
  process.exitCode = baselineComparison
    ? Number(
        baselineComparison.unexpected.length > 0 ||
          baselineComparison.invalid_resolutions.length > 0,
      )
    : Number(pending.length > 0);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(
      `[ledger] Verificação indisponível (${e.code ?? e.name}); nenhum resultado aprovado.`,
    );
    process.exitCode = 2;
  });
}
