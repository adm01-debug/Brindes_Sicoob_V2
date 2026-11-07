#!/usr/bin/env node
/**
 * audit-export.mjs
 * ----------------------------------------------------------------
 * Gate de CI: exporta um subconjunto do inventário de compliance
 * (filtrado por `--module` e/ou `--status`) em um relatório markdown
 * com a trilha de auditoria Git (último commit de cada artefato).
 *
 * Contrato:
 *  - `scripts/audit-export.mjs --status=implementado --module=Segurança`
 *  - `scripts/audit-export.mjs --status=a-implementar`
 *  - Sem filtros → exporta o inventário completo.
 *  - Saída: `AUDIT_EXPORT_FILTERED.md` (maior que 100 bytes, validado
 *    por `test-audit-scripts.mjs` via teste de consistência).
 *
 * Saída:
 *  - exit 0 → exportação gerada com sucesso.
 *  - exit 1 → erro de execução (ex.: falha ao consultar o git).
 *  - exit 2 → erro de configuração/uso (filtro inválido, inventário vazio).
 */
import fs from "node:fs";
import { execSync } from "node:child_process";

const OUT_FILE = "AUDIT_EXPORT_FILTERED.md";

// Inventário de compliance (fonte de verdade do contrato do CI).
const inventory = [
  { module: "Segurança", feature: "RLS Cross-Tenant", status: "implementado", path: "supabase/migrations/20250103_02_rls_organizations.sql" },
  { module: "Financeiro", feature: "Precisão 4 Casas", status: "implementado", path: "supabase/migrations/20260502174252_a88e3c13-46b8-4ce4-b1b8-c8500d390f3d.sql" },
  { module: "IA", feature: "Fallback Automático", status: "implementado", path: "supabase/functions/_shared/ai-usage.ts" },
  { module: "Infra", feature: "Cold Storage Logs", status: "implementado", path: "supabase/migrations/20260504-archive-logs.sql" },
  { module: "Infra", feature: "Blockchain Audit Trail", status: "a-implementar", path: "roadmap/ledger-integration" },
];

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

function lastCommitInfo(path) {
  try {
    const info = execSync(`git log -1 --format="%h | %an | %ad" -- ${path}`, { encoding: "utf8" }).trim();
    return info || "N/A (Sem commits)";
  } catch {
    return "N/A (Local Only)";
  }
}

function main() {
  const args = process.argv.slice(2);
  const moduleFilter = args.find((a) => a.startsWith("--module="))?.split("=")[1];
  const statusFilter = args.find((a) => a.startsWith("--status="))?.split("=")[1];

  if (moduleFilter !== undefined && moduleFilter === "") fail(2, "❌ Módulo vazio em --module. Uso: --module=Segurança");
  if (statusFilter !== undefined && statusFilter === "") fail(2, "❌ Status vazio em --status. Uso: --status=implementado");

  const filtered = inventory.filter((item) => {
    if (moduleFilter && item.module !== moduleFilter) return false;
    if (statusFilter && item.status !== statusFilter) return false;
    return true;
  });

  if (filtered.length === 0) {
    fail(
      2,
      `❌ Nenhum item do inventário corresponde aos filtros ` +
        `(módulo=${moduleFilter ?? "todos"}, status=${statusFilter ?? "todos"}). ` +
        "Opções válidas de módulo: Segurança, Financeiro, IA, Infra. Status: implementado, a-implementar.",
    );
  }

  let output = "# 📂 EXPORTAÇÃO DE INVENTÁRIO FILTRADA\n\n";
  output += `**Filtros:** Módulo: ${moduleFilter || "Todos"} | Status: ${statusFilter || "Todos"}\n\n`;
  output += "## 📑 ÍNDICE\n";
  filtered.forEach((item, i) => (output += `${i + 1}. [${item.feature}](#feature-${i})\n`));
  output += "\n---\n\n";

  filtered.forEach((item, i) => {
    output += `<a name="feature-${i}"></a>\n`;
    output += `### ${item.feature}\n`;
    output += `- **Módulo:** ${item.module}\n`;
    output += `- **Status:** ${item.status === "implementado" ? "✅ Implementado" : "⏳ A Implementar"}\n`;
    output += `- **Caminho:** \`${item.path}\`\n`;
    output += `- **Trilha de Auditoria (Último Commit):** ${lastCommitInfo(item.path)}\n\n`;
  });

  fs.writeFileSync(OUT_FILE, output);
  console.log(`✅ Exportação filtrada gerada em ${OUT_FILE} (${filtered.length} item(ns)).`);
}

try {
  main();
} catch (err) {
  console.error(`❌ Erro inesperado no gate audit-export: ${err?.message ?? err}`);
  process.exit(2);
}