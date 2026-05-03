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
    if (!inventoryContent.includes(fn)) {
      missingInInventory.push(fn);
    }
  });

  // Extrair lista de funções do inventário (sessão 5)
  const inventoryFunctionsMatch = inventoryContent.match(/`([a-z0-9-]+)`/g) || [];
  const inventoryFunctions = inventoryFunctionsMatch.map(f => f.replace(/`/g, ''));

  inventoryFunctions.forEach(fn => {
    // Filtro simples para pegar apenas o que parece ser nome de função na seção 5
    if (fn.includes('-') || fn.length > 3) {
      if (!realFunctions.includes(fn) && !fn.includes('/') && !fn.includes('.')) {
        // Ignorar termos comuns que não são funções
        const blacklist = ['multi-tenant', 'multi-db', 'p0', 'p1', 'p2', 'v2', 'b2b'];
        if (!blacklist.includes(fn)) {
          obsoleteInInventory.push(fn);
        }
      }
    }
  });

  console.log(`\n📊 Relatório de Divergências:`);
  console.log(`Total reais: ${realFunctions.length}`);
  
  if (missingInInventory.length > 0) {
    console.log(`\n⚠️ Funções no Repo mas NÃO no Inventário (${missingInInventory.length}):`);
    console.log(missingInInventory.join(', '));
  } else {
    console.log('\n✅ Todas as funções do repositório estão documentadas.');
  }

  if (obsoleteInInventory.length > 0) {
    console.log(`\n⚠️ Funções no Inventário mas NÃO no Repo (${obsoleteInInventory.length}):`);
    console.log(obsoleteInInventory.join(', '));
  }

  // Gera um arquivo de relatório para o CI
  const report = `
# Relatório de Divergência de Edge Functions
Data: ${new Date().toISOString()}

## No Repositório mas ausentes no Inventário:
${missingInInventory.map(f => `- ${f}`).join('\n')}

## No Inventário mas ausentes no Repositório:
${obsoleteInInventory.map(f => `- ${f}`).join('\n')}
  `;
  fs.writeFileSync('docs/EDGE_FUNCTIONS_DRIFT.md', report);
}

compareFunctions();
