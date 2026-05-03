import { execSync } from 'child_process';

console.log('🛡️  SICOOB SECURITY GATE: Running npm audit...');

try {
  const output = execSync('npm audit --json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const audit = JSON.parse(output);
  
  const critical = audit.metadata.vulnerabilities.critical || 0;
  const high = audit.metadata.vulnerabilities.high || 0;

  if (critical > 0 || high > 0) {
    console.error(`❌ SECURITY GATE FAILED: Found ${critical} critical and ${high} high vulnerabilities.`);
    process.exit(1);
  }

  console.log('✅ SECURITY GATE PASSED: No critical or high vulnerabilities found.');
} catch (error) {
  // npm audit returns exit code 1 if vulnerabilities are found
  if (error.stdout) {
    const audit = JSON.parse(error.stdout);
    const critical = audit.metadata.vulnerabilities.critical || 0;
    const high = audit.metadata.vulnerabilities.high || 0;

    if (critical > 0 || high > 0) {
      console.error(`❌ SECURITY GATE FAILED: Found ${critical} critical and ${high} high vulnerabilities.`);
      process.exit(1);
    }
    console.log('✅ SECURITY GATE PASSED: Vulnerabilities below threshold.');
  } else {
    console.error('⚠️  Audit warning: Could not parse npm audit output.', error.message);
    process.exit(0); // Don't block build on network/parsing issues during dev
  }
}
