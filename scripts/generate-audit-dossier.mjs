#!/usr/bin/env node
/**
 * generate-audit-dossier.mjs
 * ----------------------------------------------------------------
 * Gerador de CI: produz o Dossiê de Auditoria Enterprise V5
 * (`reports/DOSSIA_AUDITORIA_ENTERPRISE_V5.md`), com matriz RLS real
 * (RPC `check_tables_rls`), trilha de auditoria Git e evidências
 * rastreáveis de funcionalidades.
 *
 * Todo status do dossiê é medido nesta execução (RPC + arquivo de evidência
 * conferido); o que não é medido sai rotulado como declaração.
 *
 * Requer as variáveis de ambiente VITE_SUPABASE_URL e
 * SUPABASE_SERVICE_ROLE_KEY (definidas no workflow security-compliance.yml).
 * `AUDIT_REPORTS_DIR` troca o diretório de saída (padrão: `reports/`, que é o
 * que o workflow publica como artifact).
 *
 * Saída:
 *  - exit 0 → dossiê gerado e gravado (o conteúdo diz se há não conformidade;
 *    quem reprova tabela sem RLS é o `scan-rls-security.mjs`).
 *  - exit 1 → falha de execução (credenciais ausentes, RPC com erro ou vazia,
 *    evidência do inventário que não existe mais).
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  AUDIT_INVENTORY,
  DECLARED,
  cell,
  fetchRlsTables,
  headCommit,
  indexRlsMigrations,
  lastCommitInfo,
  reportsDir,
  summarizeRls,
  verifyEvidence,
} from './lib/audit-evidence.mjs';

export const OUT_NAME = 'DOSSIA_AUDITORIA_ENTERPRISE_V5.md';
const NO_HISTORY = 'N/A | N/A | N/A';

/**
 * Monta o markdown. Função pura sobre os dados medidos: sem rede, sem relógio implícito.
 * @param {{ rows: {relname:string, relrowsecurity:boolean}[], migrationOf: Map<string,string>,
 *   gitInfo: (path: string|undefined) => string|null, evidence: {item:object, check:object}[],
 *   commit: string|null, now: Date }} input
 */
export function buildDossier({ rows, migrationOf, gitInfo, evidence, commit, now }) {
  const rls = summarizeRls(rows);
  const broken = evidence.filter(({ check }) => !check.ok);
  const integrity =
    rls.compliant && broken.length === 0
      ? `✅ ${rls.withRls}/${rls.total} tabelas com RLS; ${evidence.filter((e) => e.check.checked).length} evidência(s) conferida(s)`
      : `❌ Não conforme — ${rls.without.length} tabela(s) sem RLS, ${broken.length} evidência(s) não localizada(s)`;

  let rlsSection = '| Tabela | RLS Habilitado | Último Commit (ID/Autor/Data) |\n| :--- | :--- | :--- |\n';
  for (const table of rows) {
    const info = gitInfo(migrationOf.get(table.relname.toLowerCase())) ?? NO_HISTORY;
    rlsSection += `| ${cell(table.relname)} | ${table.relrowsecurity ? '✅' : '❌'} | ${cell(info)} |\n`;
  }

  let evidenceSection = '';
  evidence
    .filter(({ item }) => item.status === 'implementado')
    .forEach(({ item, check }, index) => {
      evidenceSection += `### 4.${index + 1} Módulo: ${item.module}\n`;
      evidenceSection += `*   **Funcionalidade:** ${item.feature}\n`;
      evidenceSection += `    *   **Arquivo:** \`${item.path}\`\n`;
      evidenceSection += `    *   **Citação:** \`${item.quote ?? '—'}\`\n`;
      evidenceSection += `    *   **Conferência:** ${check.ok ? '✅ arquivo existe e contém o trecho' : `❌ ${check.reason}`}\n`;
      evidenceSection += `    *   **Auditoria:** ${gitInfo(item.path) ?? NO_HISTORY}\n\n`;
    });

  const rlsGlobal = rls.compliant
    ? `✅ Conforme (${rls.withRls}/${rls.total})`
    : `❌ Não conforme — sem RLS: ${rls.without.map((name) => `\`${name}\``).join(', ')}`;
  const fallback = evidence.find(({ item }) => item.feature === 'Fallback Automático');
  const fallbackStatus = !fallback
    ? DECLARED
    : fallback.check.ok
      ? `✅ Evidência conferida (\`${fallback.item.path}\`)`
      : `❌ ${fallback.check.reason}`;

  return `
# 🛡️ DOSSIÊ DE AUDITORIA ENTERPRISE V5

---

## 🕒 EVIDENCE GENESIS (AUTO-GENERATED)
*   **Data de Geração:** ${now.toISOString()}
*   **Commit Ref:** \`${commit ?? 'desconhecido'}\`
*   **Status de Integridade:** ${integrity}

---

## 1. RESUMO EXECUTIVO
Este dossiê é gerado automaticamente via pipeline de CI para garantir a integridade e rastreabilidade do ecossistema PromoGifts Sicoob. Status com ✅/❌ foram medidos nesta execução; itens com 📝 são declarações de projeto, não medições.

---

## 2. MATRIZ DE RISCO E CONTROLES LGPD
| Categoria | Base Legal | Controle Auditável | Prioridade | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Acesso** | Consentimento | RLS por Cooperativa (Multi-tenant) | P0 | ${rlsGlobal} |
| **Minimização** | Necessidade | Limitação de colunas em views public | P1 | ${DECLARED} |
| **Retenção** | Obrigação Legal | Workflow de Cold Storage (audit_log_archive) | P1 | ${DECLARED} |
| **Integridade** | Execução de Contrato | Precisão financeira 4 casas decimais | P0 | ${DECLARED} |

---

## 3. TRILHA DE AUDITORIA OPERACIONAL (RLS & SCHEMA)
${rlsSection}

---

## 4. EVIDÊNCIAS RASTREÁVEIS DE FUNCIONALIDADES

${evidenceSection}---

## 5. CHECKLIST AUDITÁVEL DE CONFORMIDADE
| Item | Critério de Aceitação | Prioridade | Status |
| :--- | :--- | :--- | :--- |
| **RLS Global** | Todas as tabelas em 'public' devem ter RLS ativo. | P0 | ${rlsGlobal} |
| **Fallback IA** | Redundância entre modelos em caso de falha. | P1 | ${fallbackStatus} |
| **Acessibilidade** | WCAG 2.1 validado via suíte de testes E2E. | P1 | ${DECLARED} |

---

## 6. CONCLUSÃO
${
  rls.compliant && broken.length === 0
    ? `Na data desta geração, ${rls.withRls} de ${rls.total} tabela(s) do schema public têm RLS ativo e todas as evidências do inventário foram localizadas no repositório.`
    : `Há não conformidade em aberto: ${rls.without.length} tabela(s) sem RLS e ${broken.length} evidência(s) não localizada(s). Este dossiê não atesta conformidade.`
}
`;
}

async function main() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variáveis de ambiente ausentes (VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).');
    return 1;
  }

  console.log('📑 Gerando Dossiê de Auditoria Enterprise V5...');
  const { createClient } = await import('@supabase/supabase-js');
  const rows = await fetchRlsTables(createClient(supabaseUrl, supabaseKey));

  const evidence = AUDIT_INVENTORY.map((item) => ({ item, check: verifyEvidence(item) }));
  const content = buildDossier({
    rows,
    migrationOf: indexRlsMigrations(),
    gitInfo: (target) => lastCommitInfo(target),
    evidence,
    commit: headCommit(),
    now: new Date(),
  });

  const outFile = path.join(reportsDir(), OUT_NAME);
  fs.writeFileSync(outFile, content);

  const rls = summarizeRls(rows);
  const broken = evidence.filter(({ check }) => !check.ok);
  for (const { item, check } of broken) console.error(`❌ Evidência inválida (${item.feature}): ${check.reason}`);
  if (!rls.compliant) console.warn(`⚠️ ${rls.without.length} tabela(s) sem RLS registradas no dossiê.`);
  console.log(`${broken.length === 0 ? '✅' : '⚠️'} Dossiê gravado em ${outFile} (${rls.withRls}/${rls.total} tabelas com RLS).`);
  return broken.length === 0 ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err) => {
      console.error(`❌ Erro no gerador de dossiê: ${err?.message ?? err}`);
      process.exitCode = 1;
    });
}
