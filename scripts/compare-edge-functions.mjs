#!/usr/bin/env node
/**
 * compare-edge-functions.mjs
 * ----------------------------------------------------------------
 * Gate de CI: compara as Edge Functions reais (supabase/functions)
 * com o inventário (docs/INVENTARIO_FUNCIONALIDADES_v2.md) e gera
 * docs/EDGE_FUNCTIONS_DRIFT.md.
 *
 * Saída:
 *  - exit 0 → relatório gerado (divergências são reportadas, não falham).
 *  - exit 2 → erro de configuração/execução.
 */
import fs from 'fs';
import path from 'path';

const isCI = process.env.CI === "true" || process.env.CI === "1";

const FUNCTIONS_DIR = 'supabase/functions';
const INVENTORY_FILE = 'docs/INVENTARIO_FUNCIONALIDADES_v2.md';
const REPORT_FILE = 'docs/EDGE_FUNCTIONS_DRIFT.md';

function compareFunctions() {
  console.log('🔍 Comparando Edge Functions reais vs Inventário...');

  if (!fs.existsSync(FUNCTIONS_DIR)) {
    console.error('❌ Diretório de funções não encontrado: ' + FUNCTIONS_DIR);
    process.exit(2);
  }
  if (!fs.existsSync(INVENTORY_FILE)) {
    console.error('❌ Inventário não encontrado: ' + INVENTORY_FILE);
    process.exit(2);
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
    for (const fn of missingInInventory) {
      if (isCI) console.log(`::warning file=compare-edge-functions.mjs,title=Funcao sem inventario::${fn}`);
    }
  } else {
    console.log('\n✅ Todas as funções do repositório estão documentadas no inventário.');
  }

  if (obsoleteInInventory.length > 0) {
    console.log(`\n⚠️ Funções no Inventário mas NÃO no Repo (${obsoleteInInventory.length}):`);
    console.log(obsoleteInInventory.join(', '));
    for (const fn of obsoleteInInventory) {
      if (isCI) console.log(`::warning file=compare-edge-functions.mjs,title=Funcao obsoleta no inventario::${fn}`);
    }
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
  fs.writeFileSync(REPORT_FILE, report);
  console.log(`\n✅ Relatório gerado em ${REPORT_FILE}`);
  process.exit(0);
}

try {
  compareFunctions();
} catch (error) {
  console.error('❌ Falha inesperada no gate: ' + (error instanceof Error ? error.message : String(error)));
  process.exit(2);
}