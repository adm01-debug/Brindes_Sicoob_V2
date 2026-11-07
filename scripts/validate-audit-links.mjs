import fs from 'fs';

/**
 * Enterprise Evidence Link Validator
 * Verifies that all external links in audit documents are reachable.
 */

const FILES_TO_VALIDATE = [
  'FINAL_ENTERPRISE_AUDIT_REPORT.md',
  'ENTERPRISE_AUDIT_REPORT_V6.md',
  'AUDIT_INVENTORY_DETAILED.md'
];

const TIMEOUT_MS = 5000;

let hasFailures = false;
let filesFound = 0;

async function validateLinks() {
  console.log('🔗 Iniciando validação de links externos de evidências...');
  
  for (const file of FILES_TO_VALIDATE) {
    if (!fs.existsSync(file)) continue;
    filesFound += 1;
    
    console.log(`\n📄 Analisando: ${file}`);
    const content = fs.readFileSync(file, 'utf-8');
    const links = content.match(/https?:\/\/[^\s)]+/g) || [];
    
    if (links.length === 0) {
      console.log('  ✅ Nenhum link externo encontrado.');
      continue;
    }

    const uniqueLinks = [...new Set(links)];
    console.log(`  🔍 Verificando ${uniqueLinks.length} links únicos...`);

    for (const link of uniqueLinks) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
        
        const response = await fetch(link, { 
          method: 'HEAD', 
          signal: controller.signal 
        }).catch(() => fetch(link, { method: 'GET', signal: controller.signal }));

        clearTimeout(timeout);

        if (response.ok) {
          console.log(`  ✅ [${response.status}] ${link}`);
        } else {
          console.error(`  ❌ [${response.status}] ${link}`);
          hasFailures = true;
        }
      } catch (e) {
        console.error(`  ❌ [ERROR] ${link} - ${e.message}`);
        hasFailures = true;
      }
    }
  }
}

await validateLinks();

if (filesFound === 0) {
  console.warn('\n⚠️ Nenhum arquivo de auditoria encontrado — nada foi validado.');
  console.warn('   Esperado: FINAL_ENTERPRISE_AUDIT_REPORT.md, ENTERPRISE_AUDIT_REPORT_V6.md, AUDIT_INVENTORY_DETAILED.md');
  console.warn('   Gere-os com: node scripts/generate-audit-dossier.mjs');
}

if (hasFailures) {
  console.error('\n🛑 Links externos quebrados encontrados nas evidências de auditoria.');
  process.exit(1);
}

console.log('\n✅ Todos os links externos das evidências estão acessíveis.');
process.exit(0);
