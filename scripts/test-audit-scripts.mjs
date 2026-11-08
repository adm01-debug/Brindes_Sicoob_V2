#!/usr/bin/env node
/**
 * test-audit-scripts.mjs
 * ----------------------------------------------------------------
 * Teste de consistência dos scripts de auditoria (CI: security-compliance).
 *
 * Executa cada gerador e valida que:
 *  - o script existe e é executável;
 *  - executa sem crash (exit 0);
 *  - o arquivo de saída existe com > 100 bytes (falha se ausente/vazio);
 *  - a estrutura interna contém o cabeçalho esperado (aviso se incompleta,
 *    para não derrubar o pipeline só por formato).
 *
 * Contrato (invocado pelo workflow security-compliance.yml após gerar os
 * dossiês):
 *   node scripts/test-audit-scripts.mjs
 *
 * Saída:
 *  - exit 0 → todos os scripts e saídas dentro do esperado.
 *  - exit 1 → script ausente, falha de execução ou arquivo de saída
 *    ausente/vazio.
 *  - Erros inesperados também saem com exit 1 (nunca falso verde).
 */
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const isCI = process.env.CI === "true" || process.env.CI === "1";

const scripts = [
  "scripts/generate-audit-dossier.mjs",
  "scripts/generate-enterprise-report.mjs",
  "scripts/audit-export.mjs",
];

const outputs = [
  { file: "DOSSIA_AUDITORIA_ENTERPRISE_V5.md", engine: "generate-audit-dossier.mjs" },
  { file: "ENTERPRISE_AUDIT_REPORT_V6.md", engine: "generate-enterprise-report.mjs" },
  { file: "AUDIT_EXPORT_FILTERED.md", engine: "audit-export.mjs" },
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function main() {
  console.log("🧪 Iniciando testes de consistência de scripts de auditoria...");

  for (const script of scripts) {
    if (!fs.existsSync(script)) fail(`  ❌ Script não encontrado: ${script}`);

    console.log(`  🏃 Executando: ${script}`);
    try {
      execFileSync(process.execPath, [script, "--status=implementado"], { stdio: "inherit" });
      console.log(`  ✅ ${script} executado com sucesso.`);
    } catch (err) {
      const detail = err?.status !== undefined ? ` (exit ${err.status})` : "";
      fail(`  ❌ ${script} falhou na execução${detail}.`);
    }
  }

  // Valida arquivos de saída: existência + não-vazio (contrato do CI).
  for (const { file } of outputs) {
    let size = 0;
    try {
      size = fs.statSync(file).size;
    } catch {
      size = 0;
    }
    if (size <= 100) {
      fail(`  ❌ Arquivo de saída inválido ou vazio: ${file} (${size} bytes).`);
    }
    console.log(`  ✅ Arquivo de saída validado: ${file}`);
  }

  // Aviso (não-falha) se a estrutura interna estiver incompleta — preserva o
  // comportamento original, que apenas sinalizava baixa confiança.
  for (const { file, engine } of outputs) {
    const content = fs.readFileSync(file, "utf8");
    const hasHeader = content.includes("EVIDENCE GENESIS") || content.includes("PROMOGIFTS") || content.includes("EXPORTAÇÃO");
    if (!hasHeader) {
      console.warn(`  ⚠️ Estrutura interna de ${file} pode estar incompleta (esperado cabeçalho do ${engine}).`);
      if (isCI) {
        console.error(`::warning file=${file},title=Estrutura possivelmente incompleta::cabeçalho esperado não localizado.`);
      }
    }
  }

  console.log("\n🏁 Todos os testes de consistência de auditoria passaram.");
}

try {
  main();
} catch (err) {
  console.error(`❌ Erro inesperado no test-audit-scripts: ${err?.message ?? err}`);
  process.exit(1);
}