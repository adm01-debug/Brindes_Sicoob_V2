import { execSync } from 'child_process';

console.log('🛡️  SECURITY GATE: Running npm audit...');

// Sem exceções por pacote: vulnerabilidades altas ou críticas bloqueiam o build.
const ALLOWLIST = new Set();

function summarize(jsonStr) {
  let audit;
  try {
    audit = JSON.parse(jsonStr);
  } catch {
    return null;
  }
  const vulns = audit?.vulnerabilities;
  if (!vulns || typeof vulns !== 'object') {
    // Older/alternate format — fall back to coarse metadata counts.
    const v = audit?.metadata?.vulnerabilities;
    if (!v) return null;
    return { blocking: [], allowlisted: [], coarseCritical: v.critical || 0, coarseHigh: v.high || 0 };
  }
  const blocking = [];
  const allowlisted = [];
  for (const [name, info] of Object.entries(vulns)) {
    if (info.severity !== 'critical' && info.severity !== 'high') continue;
    (ALLOWLIST.has(name) ? allowlisted : blocking).push(`${name} (${info.severity})`);
  }
  return { blocking, allowlisted, coarseCritical: 0, coarseHigh: 0 };
}

let raw = '';
try {
  raw = execSync('npm audit --json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
} catch (err) {
  raw = err.stdout?.toString() || '';
}

const result = summarize(raw);
if (!result) {
  console.error('Falha ao obter auditoria válida. O gate permanece bloqueado.');
  process.exit(2);
}

if (result.allowlisted.length > 0) {
  console.warn(`ℹ️  Allowlisted build-only advisories (not shipped to production): ${result.allowlisted.join(', ')}`);
}

// Coarse fallback path (no per-package data available).
if (result.coarseCritical > 0 || result.coarseHigh > 0) {
  console.error(`❌ SECURITY GATE FAILED: ${result.coarseCritical} critical, ${result.coarseHigh} high vulnerabilities.`);
  process.exit(1);
}

if (result.blocking.length > 0) {
  console.error(`❌ SECURITY GATE FAILED: ${result.blocking.length} critical/high vulnerabilities: ${result.blocking.join(', ')}`);
  process.exit(1);
}

console.log('✅ SECURITY GATE PASSED.');
