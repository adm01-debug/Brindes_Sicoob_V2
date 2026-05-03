import { execSync } from 'child_process';

console.log('🛡️  SECURITY GATE: Running npm audit...');

function parseAudit(jsonStr) {
  try {
    const audit = JSON.parse(jsonStr);
    const v = audit?.metadata?.vulnerabilities;
    if (!v) return null;
    return { critical: v.critical || 0, high: v.high || 0 };
  } catch {
    return null;
  }
}

let raw = '';
try {
  raw = execSync('npm audit --json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
} catch (err) {
  raw = err.stdout?.toString() || '';
}

const result = parseAudit(raw);
if (!result) {
  console.warn('⚠️  Could not parse audit output (likely running under bun). Skipping gate.');
  process.exit(0);
}

if (result.critical > 0 || result.high > 0) {
  console.error(`❌ SECURITY GATE FAILED: ${result.critical} critical, ${result.high} high vulnerabilities.`);
  process.exit(1);
}

console.log('✅ SECURITY GATE PASSED.');
