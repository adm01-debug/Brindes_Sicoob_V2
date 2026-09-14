import fs from 'fs';
import { execFileSync } from 'child_process';

/**
 * Audit Script Consistency Test
 * Validates that generation scripts produce valid, well-structured output.
 */

async function testScripts() {
  console.log('🧪 Iniciando testes de consistência de scripts de auditoria...');
  
  const scripts = [
    'scripts/generate-audit-dossier.mjs',
    'scripts/generate-enterprise-report.mjs',
    'scripts/audit-export.mjs'
  ];

  for (const script of scripts) {
    try {
      fs.accessSync(script, fs.constants.R_OK);
    } catch {
      console.error(`  ❌ Script não encontrado: ${script}`);
      process.exit(1);
    }

    console.log(`  🏃 Executando: ${script}`);
    try {
      // Run script and check if it crashes
      execFileSync(process.execPath, [script, '--status=implementado'], { stdio: 'inherit' });
      console.log(`  ✅ ${script} executado com sucesso.`);
    } catch (e) {
      console.error(`  ❌ ${script} falhou na execução.`);
      process.exit(1);
    }
  }

  // Validate output files exist and are not empty
  const outputs = [
    'DOSSIA_AUDITORIA_ENTERPRISE_V5.md',
    'ENTERPRISE_AUDIT_REPORT_V6.md',
    'AUDIT_EXPORT_FILTERED.md'
  ];

  for (const file of outputs) {
    let outputSize = 0;
    try {
      outputSize = fs.statSync(file).size;
    } catch {
      outputSize = 0;
    }
    if (outputSize > 100) {
      console.log(`  ✅ Arquivo de saída validado: ${file}`);
      
      // Basic structure check
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes('EVIDENCE GENESIS') || content.includes('PROMOGIFTS') || content.includes('EXPORTAÇÃO')) {
         console.log(`  🔍 Estrutura interna validada em ${file}.`);
      } else {
         console.warn(`  ⚠️ Estrutura interna de ${file} pode estar incompleta.`);
      }
    } else {
      console.error(`  ❌ Arquivo de saída inválido ou vazio: ${file}`);
      process.exit(1);
    }
  }

  console.log('\n🏁 Todos os testes de consistência de auditoria passaram.');
}

testScripts();
