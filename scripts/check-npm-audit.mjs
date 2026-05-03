import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

try {
  console.log('Running npm audit...');
  const auditOutput = execSync('npm audit --json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const auditData = JSON.parse(auditOutput);
  
  const highVulnerabilities = auditData.metadata.vulnerabilities.high || 0;
  const criticalVulnerabilities = auditData.metadata.vulnerabilities.critical || 0;
  
  if (highVulnerabilities > 0 || criticalVulnerabilities > 0) {
    console.error(`❌ Security Gate Failed: Found ${highVulnerabilities} high and ${criticalVulnerabilities} critical vulnerabilities.`);
    process.exit(1);
  }
  
  console.log('✅ Security Gate Passed: No high or critical vulnerabilities found.');
} catch (error) {
  // npm audit returns non-zero exit code if vulnerabilities are found
  if (error.stdout) {
    try {
      const auditData = JSON.parse(error.stdout);
      const highVulnerabilities = auditData.metadata.vulnerabilities.high || 0;
      const criticalVulnerabilities = auditData.metadata.vulnerabilities.critical || 0;
      
      if (highVulnerabilities > 0 || criticalVulnerabilities > 0) {
        console.error(`❌ Security Gate Failed: Found ${highVulnerabilities} high and ${criticalVulnerabilities} critical vulnerabilities.`);
        process.exit(1);
      }
      console.log('✅ Security Gate Passed: No high or critical vulnerabilities found.');
    } catch (parseError) {
      console.error('Failed to parse audit output', parseError);
      process.exit(1);
    }
  } else {
    console.error('Failed to run npm audit', error);
    process.exit(1);
  }
}
