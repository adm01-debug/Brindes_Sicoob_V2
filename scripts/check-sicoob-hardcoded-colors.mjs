import fs from 'fs';
import path from 'path';

/**
 * Script para evitar regressão de cores hardcoded em caminhos Sicoob.
 * Padrão: text-emerald, bg-amber, text-red, text-blue, etc.
 * 
 * Rodar via: bun scripts/check-sicoob-hardcoded-colors.mjs
 */

const FORBIDDEN_PATTERNS = [
  /text-emerald-/i,
  /bg-emerald-/i,
  /text-amber-/i,
  /bg-amber-/i,
  /text-red-/i,
  /bg-red-/i,
  /text-blue-/i,
  /bg-blue-/i,
  /border-emerald-/i,
  /border-amber-/i
];

const TARGET_DIRS = [
  'src/pages/sicoob',
  'src/components/sicoob'
];

let hasErrors = false;

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    FORBIDDEN_PATTERNS.forEach(pattern => {
      if (pattern.test(line)) {
        console.error(`❌ [COR HARDCODED] ${filePath}:${index + 1}`);
        console.error(`   Linha: ${line.trim()}`);
        console.error(`   Padrão violado: ${pattern}`);
        hasErrors = true;
      }
    });
  });
}

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile() && /\.(tsx|ts|js|jsx)$/.test(entry.name)) {
      checkFile(fullPath);
    }
  }
}

console.log('🔍 Verificando cores hardcoded em módulos Sicoob...');
TARGET_DIRS.forEach(scanDir);

if (hasErrors) {
  console.log('\n🛑 Falha na verificação. Use tokens semânticos (text-brand, text-status-delivered, etc).');
  process.exit(1);
} else {
  console.log('\n✅ Nenhuma cor hardcoded encontrada nos diretórios Sicoob.');
}
