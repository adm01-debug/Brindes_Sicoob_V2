import fs from 'fs';
import path from 'path';

const ROUTES_DIR = 'src/routes/config';
const OUTPUT_FILE = 'docs/ROUTES.md';

const files = fs.readdirSync(ROUTES_DIR);
let markdown = '# 🗺️ Mapa Automático de Rotas\n\n';
markdown += '> Documento gerado automaticamente via `scripts/generate-routes-map.mjs`\n\n';

files.forEach(file => {
  const content = fs.readFileSync(path.join(ROUTES_DIR, file), 'utf8');
  const sectionName = file.replace('.ts', '').toUpperCase();
  
  markdown += `## 📂 Seção: ${sectionName}\n`;
  markdown += '| Rota | Componente |\n';
  markdown += '|------|------------|\n';

  const matches = content.matchAll(/path:\s*["']([^"']+)["'],\s*component:\s*lazyWithRetry\(\(\)\s*=>\s*import\(["']([^"']+)["']\)\)/g);
  
  for (const match of matches) {
    const routePath = match[1];
    const componentPath = match[2];
    const condition = file === 'public.ts' && ['/loja-demo', '/demonstracao'].includes(routePath)
      ? ' (somente dev ou `VITE_ENABLE_DEMO_PAGES=true`)'
      : '';
    markdown += `| \`${routePath}\` | \`${componentPath}\`${condition} |\n`;
  }
  
  markdown += '\n';
});

fs.writeFileSync(OUTPUT_FILE, `${markdown.trimEnd()}\n`);
console.log(`Mapa de rotas gerado em ${OUTPUT_FILE}`);
