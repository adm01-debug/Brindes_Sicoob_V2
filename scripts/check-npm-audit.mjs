import { execSync } from 'child_process';
import { createRequire } from 'module';

console.log('🛡️  SECURITY GATE: Running npm audit...');

// Sem exceções por pacote: vulnerabilidades altas ou críticas bloqueiam o build.
const ALLOWLIST = new Set();

// Exceções por advisory, nunca por pacote: liberar um GHSA específico mantém
// o pacote bloqueado para qualquer outra vulnerabilidade futura.
const ALLOWED_ADVISORIES = new Map([
  [
    'GHSA-fc5q-39xc-vjpf',
    'picomatch <=4.0.7 ReDoS. Dependência apenas de build (vite, vitest, tailwind, ' +
      'eslint), nunca entra no bundle, e o padrão glob vem do próprio repositório. ' +
      'Sem versão corrigida publicada: micromatch/picomatch#194 ainda está aberta. ' +
      'Remover assim que picomatch > 4.0.7 for lançado.',
  ],
]);
const require = createRequire(import.meta.url);

function verifyBracesPatch() {
  const braces = require('braces');
  const { version } = require('braces/package.json');
  if (version !== '3.0.4-sicoob.1') {
    throw new Error(`Versão corrigida de braces não instalada: ${version}`);
  }

  const nestedInput = `${'{'.repeat(101)}x${'}'.repeat(101)}`;
  try {
    braces.parse(nestedInput);
  } catch (error) {
    if (error instanceof SyntaxError && error.message.includes('nesting depth')) return;
    throw error;
  }

  throw new Error('A proteção de profundidade de braces não bloqueou a entrada adversarial.');
}

try {
  verifyBracesPatch();
} catch (error) {
  console.error(`❌ SECURITY GATE FAILED: ${error.message}`);
  process.exit(1);
}

/**
 * Percorre a cadeia `via` até as origens e devolve os identificadores de
 * advisory que afetam o pacote, direta ou transitivamente.
 */
function collectAdvisoryIds(name, vulns, seen = new Set()) {
  if (seen.has(name)) return [];
  seen.add(name);
  const info = vulns[name];
  if (!info || !Array.isArray(info.via)) return [];
  const ids = [];
  for (const via of info.via) {
    if (typeof via === 'string') {
      ids.push(...collectAdvisoryIds(via, vulns, seen));
      continue;
    }
    const match = /GHSA-[0-9a-z-]+/.exec(via?.url ?? '');
    ids.push(match ? match[0] : `sem-id:${via?.title ?? 'desconhecido'}`);
  }
  return ids;
}

/** Só libera o pacote quando todos os advisories dele estão liberados. */
function isFullyAllowlisted(name, vulns) {
  const ids = collectAdvisoryIds(name, vulns);
  if (ids.length === 0) return false;
  return ids.every((id) => ALLOWED_ADVISORIES.has(id));
}

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
    if (ALLOWLIST.has(name) || isFullyAllowlisted(name, vulns)) {
      allowlisted.push(`${name} (${info.severity})`);
      continue;
    }
    blocking.push(`${name} (${info.severity})`);
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
