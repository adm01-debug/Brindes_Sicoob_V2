import fs from 'fs';
import path from 'path';

const DOCS_DIR = 'docs';
const MODULES_FILE = path.join(DOCS_DIR, 'MODULES.md');
const ROUTES_FILE = path.join(DOCS_DIR, 'ROUTES.md');
const INVENTORY_FILE = path.join(DOCS_DIR, 'INVENTARIO_FUNCIONALIDADES_v2.md');

function validateLinks() {
  console.log('🔍 Validando consistência entre documentos...');
  
  if (!fs.existsSync(MODULES_FILE)) throw new Error('MODULES.md não encontrado');
  if (!fs.existsSync(ROUTES_FILE)) throw new Error('ROUTES.md não encontrado');
  if (!fs.existsSync(INVENTORY_FILE)) throw new Error('INVENTARIO_FUNCIONALIDADES_v2.md não encontrado');

  const modulesContent = fs.readFileSync(MODULES_FILE, 'utf8');
  const routesContent = fs.readFileSync(ROUTES_FILE, 'utf8');
  const inventoryContent = fs.readFileSync(INVENTORY_FILE, 'utf8');

  let errors = [];

  // 1. Verificar se o inventário cita MODULES e ROUTES
  if (!inventoryContent.includes('MODULES.md') && !inventoryContent.includes('Master Module Index')) {
    console.warn('⚠️ O inventário não cita explicitamente o Master Module Index (MODULES.md)');
  }

  // 2. Validar links internos no MODULES.md para arquivos em docs/
  const docLinks = modulesContent.match(/\[.*\]\((docs\/.*\.md)\)/g) || [];
  docLinks.forEach(link => {
    const filePath = link.match(/\((docs\/.*\.md)\)/)[1];
    if (!fs.existsSync(filePath)) {
      errors.push(`❌ Link quebrado em MODULES.md: ${filePath}`);
    }
  });

  // 3. Validar se rotas críticas em INVENTORY_FILE estão presentes em ROUTES_FILE
  const criticalRoutes = inventoryContent.match(/\/[a-z0-9\/-]+/g) || [];
  criticalRoutes.forEach(route => {
    // Filtrar rotas que parecem caminhos de arquivo ou não são do app
    if (route.startsWith('/admin') || route.startsWith('/dashboard')) {
       if (!routesContent.includes(route)) {
         errors.push(`❌ Rota crítica "${route}" citada no inventário não encontrada em ROUTES.md`);
       }
    }
  });

  if (errors.length > 0) {
    console.error('\n' + errors.join('\n'));
    process.exit(1);
  }

  console.log('✅ Consistência documental validada com sucesso!');
}

validateLinks();
