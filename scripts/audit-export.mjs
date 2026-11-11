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
 *  - Saída: `reports/AUDIT_EXPORT_<status>_<módulo>.md` (um arquivo por
 *    combinação de filtros; `AUDIT_EXPORT_COMPLETO.md` sem filtros).
 *    `AUDIT_REPORTS_DIR` troca o diretório.
 *  - Item `implementado` só é exportado como tal se o arquivo de evidência
 *    existir e contiver o trecho citado (`scripts/lib/audit-evidence.mjs`).
 *
 * Saída:
 *  - exit 0 → exportação gerada com sucesso.
 *  - exit 1 → evidência de item implementado não localizada, ou falha de execução.
 *  - exit 2 → erro de configuração/uso (flag ou filtro inválido, inventário vazio).
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { EXIT_FAIL, EXIT_USAGE, runCli } from "./lib/cli.mjs";
import {
  AUDIT_INVENTORY,
  AUDIT_MODULES,
  AUDIT_STATUSES,
  auditExportFileName,
  lastCommitInfo,
  reportsDir,
  verifyEvidence,
} from "./lib/audit-evidence.mjs";

/** Markdown da exportação. Função pura sobre os itens já conferidos. */
export function buildExport({ items, moduleFilter, statusFilter, commitInfo }) {
  let output = "# 📂 EXPORTAÇÃO DE INVENTÁRIO FILTRADA\n\n";
  output += `**Filtros:** Módulo: ${moduleFilter || "Todos"} | Status: ${statusFilter || "Todos"}\n\n`;
  output += "## 📑 ÍNDICE\n";
  items.forEach(({ item }, i) => (output += `${i + 1}. [${item.feature}](#feature-${i})\n`));
  output += "\n---\n\n";

  items.forEach(({ item, check }, i) => {
    const status =
      item.status !== "implementado"
        ? "⏳ A Implementar"
        : check.ok
          ? "✅ Implementado (evidência conferida)"
          : `❌ Declarado implementado, mas ${check.reason}`;
    output += `<a name="feature-${i}"></a>\n`;
    output += `### ${item.feature}\n`;
    output += `- **Módulo:** ${item.module}\n`;
    output += `- **Status:** ${status}\n`;
    output += `- **Caminho:** \`${item.path}\`\n`;
    if (item.quote) output += `- **Trecho conferido:** \`${item.quote}\`\n`;
    output += `- **Trilha de Auditoria (Último Commit):** ${commitInfo(item.path) ?? "N/A (sem commits para este caminho)"}\n\n`;
  });
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await runCli(
    {
      name: "audit-export",
      summary: "Exporta o inventário de compliance filtrado, com evidência conferida.",
      usage: "node scripts/audit-export.mjs [--module=<módulo>] [--status=<status>]",
      spec: {
        module: { type: "string", description: `Módulo: ${AUDIT_MODULES.join(", ")}` },
        status: { type: "string", description: `Status: ${AUDIT_STATUSES.join(", ")}` },
      },
      examples: [
        "node scripts/audit-export.mjs --status=implementado --module=Segurança",
        "node scripts/audit-export.mjs --status=a-implementar",
      ],
    },
    ({ values, positional, log }) => {
      const { module: moduleFilter, status: statusFilter } = values;
      if (positional.length > 0) {
        return { exitCode: EXIT_USAGE, message: `Argumento inesperado: ${positional.join(" ")}` };
      }
      if (moduleFilter !== undefined && !AUDIT_MODULES.includes(moduleFilter)) {
        return {
          exitCode: EXIT_USAGE,
          message: `Módulo inválido em --module: "${moduleFilter}". Válidos: ${AUDIT_MODULES.join(", ")}.`,
        };
      }
      if (statusFilter !== undefined && !AUDIT_STATUSES.includes(statusFilter)) {
        return {
          exitCode: EXIT_USAGE,
          message: `Status inválido em --status: "${statusFilter}". Válidos: ${AUDIT_STATUSES.join(", ")}.`,
        };
      }

      const items = AUDIT_INVENTORY.filter(
        (item) =>
          (!moduleFilter || item.module === moduleFilter) && (!statusFilter || item.status === statusFilter),
      ).map((item) => ({ item, check: verifyEvidence(item) }));

      if (items.length === 0) {
        return {
          exitCode: EXIT_USAGE,
          message:
            `Nenhum item do inventário corresponde aos filtros ` +
            `(módulo=${moduleFilter ?? "todos"}, status=${statusFilter ?? "todos"}).`,
        };
      }

      const outFile = path.join(
        reportsDir(),
        auditExportFileName({ module: moduleFilter, status: statusFilter }),
      );
      fs.writeFileSync(
        outFile,
        buildExport({ items, moduleFilter, statusFilter, commitInfo: (target) => lastCommitInfo(target) }),
      );

      const broken = items.filter(({ check }) => !check.ok);
      for (const { item, check } of broken) log.error(`Evidência inválida (${item.feature}): ${check.reason}`, item.path);
      if (broken.length > 0) {
        return {
          exitCode: EXIT_FAIL,
          message: `${broken.length} item(ns) "implementado" sem evidência no repositório; exportação gravada em ${outFile}.`,
        };
      }
      console.log(`✅ Exportação filtrada gerada em ${outFile} (${items.length} item(ns)).`);
      return 0;
    },
  );
}
