import fs from 'fs';
import path from 'path';

const FUNCTIONS_DIR = 'supabase/functions';
const INVENTORY_FILE = 'docs/INVENTARIO_FUNCIONALIDADES_v2.md';

function compareFunctions() {
  console.log('🔍 Comparando Edge Functions reais vs Inventário...');

  if (!fs.existsSync(FUNCTIONS_DIR)) {
    console.error('❌ Diretório de funções não encontrado');
    process.exit(1);
  }

  const realFunctions = fs.readdirSync(FUNCTIONS_DIR).filter(file => {
    const fullPath = path.join(FUNCTIONS_DIR, file);
    return fs.statSync(fullPath).isDirectory() && file !== '_shared' && file !== 'tests';
  });

  const inventoryContent = fs.readFileSync(INVENTORY_FILE, 'utf8');
  
  let missingInInventory = [];
  let obsoleteInInventory = [];

  realFunctions.forEach(fn => {
    if (!inventoryContent.includes('`' + fn + '`')) {
      missingInInventory.push(fn);
    }
  });

  // Extrair lista de funções do inventário (sessão 5)
  const inventoryFunctionsMatch = inventoryContent.match(/`([a-z0-9-]+)`/g) || [];
  const inventoryFunctions = [...new Set(inventoryFunctionsMatch.map(f => f.replace(/`/g, '')))];

  const blacklist = ['multi-tenant', 'multi-db', 'p0', 'p1', 'p2', 'v2', 'b2b', 'admin', 'vendedor', 'gerente_pa', 'gestor_compras', 'dev'];

  inventoryFunctions.forEach(fn => {
    if (blacklist.includes(fn)) return;
    if (fn.includes('/') || fn.includes('.') || fn.length < 3) return;

    if (!realFunctions.includes(fn)) {
      obsoleteInInventory.push(fn);
    }
  });

  console.log(`\n📊 Relatório de Divergências:`);
  console.log(`Total reais: ${realFunctions.length}`);
  
  if (missingInInventory.length > 0) {
    console.log(`\n⚠️ Funções no Repo mas NÃO no Inventário (${missingInInventory.length}):`);
    console.log(missingInInventory.join(', '));
  } else {
    console.log('\n✅ Todas as funções do repositório estão documentadas no inventário.');
  }

  if (obsoleteInInventory.length > 0) {
    console.log(`\n⚠️ Funções no Inventário mas NÃO no Repo (${obsoleteInInventory.length}):`);
    console.log(obsoleteInInventory.join(', '));
  } else {
    console.log('✅ Nenhuma função obsoleta encontrada no inventário.');
  }

  const report = `
# Relatório de Divergência de Edge Functions
Data: ${new Date().toISOString()}

## Resumo
- Total reais (repo): ${realFunctions.length}
- Total documentadas: ${inventoryFunctions.length}

## No Repositório mas ausentes no Inventário:
${missingInInventory.length > 0 ? missingInInventory.map(f => `- ${f}`).join('\n') : '- Nenhuma'}

## No Inventário mas ausentes no Repositório (Obsoletas):
${obsoleteInInventory.length > 0 ? obsoleteInInventory.map(f => `- ${f}`).join('\n') : '- Nenhuma'}
  `;
  fs.writeFileSync('docs/EDGE_FUNCTIONS_DRIFT.md', report);
}

compareFunctions();
