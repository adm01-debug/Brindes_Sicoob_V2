import fs from 'fs';

const serviceData = fs.readFileSync('service_map.txt', 'utf8');
const lines = serviceData.split('\n');

const map = {};

lines.forEach(line => {
  if (!line.trim()) return;
  const match = line.match(/^([^:]+):.*supabase\.(rpc|from)\(['"]([^'"]+)['"]\)/);
  if (match) {
    const filePath = match[1];
    const type = match[2].toUpperCase();
    const service = match[3];
    
    // Normalize page name
    let page = filePath.split('/').pop().replace(/\.(tsx|ts)$/, '');
    if (filePath.includes('src/pages/')) {
        const parts = filePath.split('src/pages/');
        page = parts[1].split('/')[0];
        if (page.endsWith('.tsx') || page.endsWith('.ts')) {
            page = page.replace(/\.(tsx|ts)$/, '');
        }
    } else if (filePath.includes('src/hooks/')) {
        page = 'Global Hooks / Components';
    }

    if (!map[page]) map[page] = { rpcs: new Set(), tables: new Set() };
    
    if (type === 'RPC') {
        map[page].rpcs.add(service);
    } else {
        map[page].tables.add(service);
    }
  }
});

let markdown = '# 🗺️ Mapa de Endpoints e Dependências Sicoob\n\n';
markdown += 'Este mapa descreve quais tabelas e funções do Supabase (RPCs) são consumidas por cada módulo/tela do sistema.\n\n';

for (const [page, data] of Object.entries(map)) {
    markdown += `## 📱 Módulo: ${page}\n`;
    if (data.tables.size > 0) {
        markdown += `**Tabelas (from):**\n`;
        Array.from(data.tables).sort().forEach(t => markdown += `- \`${t}\`\n`);
    }
    if (data.rpcs.size > 0) {
        markdown += `**Funções (rpc):**\n`;
        Array.from(data.rpcs).sort().forEach(r => markdown += `- \`${r}\`\n`);
    }
    markdown += '\n';
}

fs.writeFileSync('docs/API_DEPENDENCY_MAP.md', markdown);
console.log('Map generated successfully.');
