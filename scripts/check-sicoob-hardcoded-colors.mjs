import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Script para evitar regressão de cores hardcoded em caminhos Sicoob.
 * Padrão: text-emerald, bg-amber, text-red, text-blue, etc.
 * 
 * Rodar via: node scripts/check-sicoob-hardcoded-colors.mjs
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

// Resolvidos a partir deste arquivo: rodar de outro cwd não pode "passar" sem varrer nada.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGET_DIRS = [
  'src/pages/sicoob',
  'src/components/sicoob',
  'src/pages/admin/sicoob'
].map(dir => path.join(REPO_ROOT, dir));

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
const missingDirs = TARGET_DIRS.filter(dir => !fs.existsSync(dir));
if (missingDirs.length > 0) {
  // Diretório renomeado/removido: antes o gate seguia verde sem cobrir nada.
  console.error(`❌ Diretório(s) alvo não encontrado(s): ${missingDirs.join(', ')}. Atualize TARGET_DIRS.`);
  process.exit(2);
}
TARGET_DIRS.forEach(scanDir);

if (hasErrors) {
  console.log('\n🛑 Falha na verificação. Use tokens semânticos (text-brand, text-status-delivered, etc).');
  process.exit(1);
} else {
  console.log('\n✅ Nenhuma cor hardcoded encontrada nos diretórios Sicoob.');
}
