import fs from 'fs';
import { execSync } from 'child_process';

const args = process.argv.slice(2);
const moduleFilter = args.find(a => a.startsWith('--module='))?.split('=')[1];
const statusFilter = args.find(a => a.startsWith('--status='))?.split('=')[1];

const inventory = [
  { module: 'Segurança', feature: 'RLS Cross-Tenant', status: 'implementado', path: 'supabase/migrations/20250103_02_rls_organizations.sql' },
  { module: 'Financeiro', feature: 'Precisão 4 Casas', status: 'implementado', path: 'supabase/migrations/20260502174252_a88e3c13-46b8-4ce4-b1b8-c8500d390f3d.sql' },
  { module: 'IA', feature: 'Fallback Automático', status: 'implementado', path: 'supabase/functions/_shared/ai-usage.ts' },
  { module: 'Infra', feature: 'Cold Storage Logs', status: 'implementado', path: 'supabase/migrations/20260504-archive-logs.sql' },
  { module: 'Infra', feature: 'Blockchain Audit Trail', status: 'a-implementar', path: 'roadmap/ledger-integration' }
];

let filtered = inventory.filter(item => {
  let match = true;
  if (moduleFilter && item.module !== moduleFilter) match = false;
  if (statusFilter && item.status !== statusFilter) match = false;
  return match;
});

let output = `# 📂 EXPORTAÇÃO DE INVENTÁRIO FILTRADA\n\n`;
output += `**Filtros:** Módulo: ${moduleFilter || 'Todos'} | Status: ${statusFilter || 'Todos'}\n\n`;
output += `## 📑 ÍNDICE\n`;
filtered.forEach((item, i) => output += `${i+1}. [${item.feature}](#feature-${i})\n`);
output += `\n---\n\n`;

filtered.forEach((item, i) => {
  let gitInfo = "N/A (Local Only)";
  try {
    gitInfo = execSync(`git log -1 --format="%h | %an | %ad" -- ${item.path}`).toString().trim();
  } catch(e) {}
  
  output += `<a name="feature-${i}"></a>\n`;
  output += `### ${item.feature}\n`;
  output += `- **Módulo:** ${item.module}\n`;
  output += `- **Status:** ${item.status === 'implementado' ? '✅ Implementado' : '⏳ A Implementar'}\n`;
  output += `- **Caminho:** \`${item.path}\`\n`;
  output += `- **Trilha de Auditoria (Último Commit):** ${gitInfo}\n\n`;
});

fs.writeFileSync('AUDIT_EXPORT_FILTERED.md', output);
console.log('✅ Exportação filtrada gerada em AUDIT_EXPORT_FILTERED.md');
