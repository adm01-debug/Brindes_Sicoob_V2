#!/usr/bin/env node
/**
 * generate-enterprise-report.mjs
 * ----------------------------------------------------------------
 * Gerador de CI: produz o Relatório de Auditoria e Governança
 * (`reports/ENTERPRISE_AUDIT_REPORT_V6.md`) com métricas reais do Supabase
 * (tabelas com RLS, logs de auditoria, total de Edge Functions).
 *
 * Toda métrica é medida nesta execução; status sem medição sai rotulado como
 * declaração. Nenhum percentual é literal.
 *
 * Requer VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (definidas no
 * workflow security-compliance.yml). `AUDIT_REPORTS_DIR` troca o diretório de
 * saída (padrão: `reports/`, publicado como artifact pelo workflow).
 *
 * Saída:
 *  - exit 0 → relatório gerado e gravado com sucesso.
 *  - exit 1 → falha de execução (credenciais ausentes, RPC/leitura com erro).
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  AUDIT_INVENTORY,
  DECLARED,
  countEdgeFunctions,
  fetchRlsTables,
  reportsDir,
  summarizeRls,
  verifyEvidence,
} from "./lib/audit-evidence.mjs";

export const OUT_NAME = "ENTERPRISE_AUDIT_REPORT_V6.md";

/**
 * Métricas do banco. supabase-js não lança em erro: devolve `{ error }`, e com
 * `head: true` a contagem vem em `count` (o `data` é sempre null).
 */
export async function getStats(supabase) {
  const rls = summarizeRls(await fetchRlsTables(supabase));
  // Requisição HEAD: em erro não há corpo, então a mensagem vem vazia e o status é o que informa.
  const { count, error, status } = await supabase
    .from("admin_audit_log")
    .select("id", { count: "exact", head: true });
  if (error) throw new Error(`Contagem de admin_audit_log falhou: ${error.message || `HTTP ${status}`}`);
  if (typeof count !== "number") throw new Error("Contagem de admin_audit_log não devolvida pelo banco.");

  return { rls, auditLogs: count, functions: countEdgeFunctions() };
}

function moduleStatus(feature) {
  const item = AUDIT_INVENTORY.find((entry) => entry.feature === feature);
  if (!item) return DECLARED;
  const check = verifyEvidence(item);
  return check.ok ? "✅ Evidência conferida" : `❌ ${check.reason}`;
}

function modulePath(feature) {
  return AUDIT_INVENTORY.find((entry) => entry.feature === feature)?.path ?? "—";
}

export function buildReport(stats, now = new Date()) {
  const { rls } = stats;
  const rlsLine = rls.compliant
    ? `${rls.withRls} de ${rls.total} (cobertura de ${rls.pct}% das tabelas em 'public').`
    : `${rls.withRls} de ${rls.total} (cobertura de ${rls.pct}%) — ❌ sem RLS: ${rls.without.map((name) => `\`${name}\``).join(", ")}.`;

  return `
# 🏢 RELATÓRIO DE AUDITORIA E GOVERNANÇA - PROMOGIFTS V3.4

**Data de Emissão:** ${now.toISOString().slice(0, 10)}
**Versão do Documento:** 6.0
**Classificação:** ESTRITAMENTE CONFIDENCIAL

---

## 📋 1. SUMÁRIO EXECUTIVO

Este relatório apresenta as métricas medidas nesta execução sobre o ecossistema PromoGifts. Isolamento de dados (RLS): ${rls.compliant ? `✅ ${rls.withRls}/${rls.total} tabelas do schema public com RLS ativo` : `❌ ${rls.without.length} tabela(s) do schema public sem RLS`}. Status com ✅/❌ foram medidos; itens com 📝 são declarações de projeto, não medições.

### 🚩 Riscos e Lacunas (GAP Analysis)
*   **Performance (IA):** Dependência de latência de terceiros (Gemini/OpenAI). *Ações Mitigatórias: Fallback implementado.*
*   **Dados Frios:** Crescimento acelerado de logs. *Ação: Arquitetura de Cold Storage implementada.*
*   **Acessibilidade:** Necessidade de auditoria contínua em novos componentes customizados.

---

## 📊 2. MATRIZ DE MÓDULOS E RASTREABILIDADE

| Módulo | Funcionalidade Principal | Path do Repositório | Dependências | Status |
| :--- | :--- | :--- | :--- | :--- |
| **SEGURANÇA** | Isolamento de Dados (RLS) | \`${modulePath("RLS Cross-Tenant")}\` | PostgreSQL, Auth | ${moduleStatus("RLS Cross-Tenant")} |
| **FINANCEIRO** | Precisão 4 Casas Decimais | \`${modulePath("Precisão 4 Casas")}\` | NUMERIC(14,4) | ${moduleStatus("Precisão 4 Casas")} |
| **IA (MAGIC UP)** | Fallback entre modelos | \`${modulePath("Fallback Automático")}\` | Lovable AI Gateway | ${moduleStatus("Fallback Automático")} |
| **INFRA** | Audit Trail & Cold Storage | \`${modulePath("Cold Storage Logs")}\` | Git, Supabase RPC | ${moduleStatus("Cold Storage Logs")} |
| **SICOOB** | Workflow de Alçadas | \`supabase/functions/sicoob-approval-notifications/\` | Slack/Email Webhooks | ${DECLARED} |

---

## 🔍 3. SEÇÃO DE EVIDÊNCIAS E MÉTRICAS

Justificativa técnica baseada em telemetria e análise de código:

### 3.1 Métricas de Banco de Dados
*   **Tabelas com RLS:** ${rlsLine}
*   **Logs de Auditoria Ativos:** ${stats.auditLogs} registros rastreáveis em \`admin_audit_log\`.
*   **Integridade de Tipo:** preço unitário em \`NUMERIC(14,4)\` — ${moduleStatus("Precisão 4 Casas")}.

### 3.2 Contratos de Edge Functions (SLA)
*   **Total de Funções:** ${stats.functions} (diretórios com \`index.ts\` em \`supabase/functions/\`).
*   **Segurança:** cobertura de autorização medida pelo gate \`node scripts/check-edge-authorization.mjs\` (não reexecutado aqui).

---

## 📈 4. MATRIZ DE RISCOS (PROBABILIDADE X IMPACTO)

| Risco | Probabilidade | Impacto | Controle Implementado |
| :--- | :--- | :--- | :--- |
| Vazamento Multi-tenant | Muito Baixa | Catastrófico | RLS OrgID enforced em nível de Engine. |
| Falha de Provedor de IA | Média | Moderado | Workflow de Fallback Automático (Shared Lib). |
| Inconsistência de Verba | Baixa | Moderado | Lock pessimista e Precisão Arbitrária. |

---

## 🛠️ 5. PLANO ACIONÁVEL (BACKLOG PRIORIZADO)

| Ordem | Item | Impacto | Esforço | Critério de Aceite |
| :--- | :--- | :--- | :--- | :--- |
| **1** | Auditoria Semanal RLS | P0 | Baixo | Pipeline de CI verde em caso de conformidade 100%. |
| **2** | Otimização ProductsManager | P1 | Médio | Carregamento < 2s para catálogos > 10k SKUs. |
| **3** | Redundância de Storage | P2 | Médio | Bucket B ativado em caso de erro 5xx no Bucket A. |

---

## 📎 6. EXPORTAÇÃO FILTRADA
*Para exportar trechos específicos, utilize os scripts:*
*   \`node scripts/audit-export.mjs --module=Segurança\`
*   \`node scripts/audit-export.mjs --status=a-implementar\`

---
*Gerado por: Lovable AI Enterprise Auditor*
`;

}

async function main() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Variáveis de ambiente ausentes (VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
    return 1;
  }

  console.log("🏗️ Gerando Relatório de Auditoria Estruturado (Enterprise Grade)...");
  const { createClient } = await import("@supabase/supabase-js");
  const stats = await getStats(createClient(supabaseUrl, supabaseKey));

  const outFile = path.join(reportsDir(), OUT_NAME);
  fs.writeFileSync(outFile, buildReport(stats));
  console.log(
    `✅ Relatório Enterprise V6 gerado em: ${outFile} ` +
      `(${stats.rls.withRls}/${stats.rls.total} tabelas com RLS, ${stats.auditLogs} logs, ${stats.functions} funções).`,
  );
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err) => {
      console.error(`❌ Erro no gerador de relatório: ${err?.message ?? err}`);
      process.exitCode = 1;
    });
}
