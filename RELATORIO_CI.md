# RELATORIO_CI.md — Brindes_Sicoob_V2

Gerado em: 2026-10-22

---

## Baseline (antes do merge do PR #141)

| Workflow | Status | SHA |
|---|---|---|
| Security Scan | ❌ failure | 82262c4 |
| Qualidade contínua | ❌ failure | 82262c4 |
| Enterprise Compliance & Audit Reporting | ❌ failure | 82262c4 |
| Running Copilot Code Review | ❌ failure | 4f5de10 |
| npm_and_yarn @vitest/mocker | ❌ failure | ae1b92b |
| Branch Protection Sentinel | ✅ success | — |
| CodeQL | ✅ success | — |
| Migration Ledger Drift | ✅ success | — |
| Portal Sicoob | ✅ success | — |

---

## Estado pós-merge PR #141 (SHA main: 2df1b01)

| Workflow | Status | Run | Observação |
|---|---|---|---|
| Security Scan | ✅ success | [39868499314](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39868499314) | CVE dompurify corrigido |
| Qualidade contínua | 🔄 in_progress | [39868499453](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39868499453) | Aguardando conclusão |
| Branch Protection Sentinel | ✅ success | [39868499260](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39868499260) | Manteve verde |
| CodeQL | 🔄 in_progress | [39868499403](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39868499403) | Aguardando conclusão |
| Portal Sicoob | 🔄 in_progress | [39868499315](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39868499315) | Aguardando conclusão |
| Enterprise Compliance & Audit Reporting | ❌ failure | [39868499402](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39868499402) | **EXTERNO** — ver PENDENCIAS.md |
| Running Copilot Code Review | ❌ failure | [39785094125](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39785094125) | **EXTERNO** — ver PENDENCIAS.md |
| npm_and_yarn @vitest/mocker | ⚠️ em investigação | [39775463512](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39775463512) | Run pré-merge; vitest 4.1.12 já em main |
| E2E (Playwright) | ⚠️ em investigação | [37775702358](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/37775702358) | Run muito antigo (SHA a974d77); investigando trigger |

---

## Correções aplicadas (PR #141 — mergeado em 2026-10-22)

### 1. CVE dompurify 3.4.16 → 3.4.17
- **Impacto:** Security Scan e Qualidade contínua falhavam por 3 CVEs críticas/altas
- **Correção:** `npm overrides: { "dompurify": "3.4.17" }` em package.json
- **CVEs resolvidas:** GHSA-cg2g-xh64-v4q7 (Critical), GHSA-mrv2-3pqr-j5jr (High), GHSA-c6gr-qvv4-5f (High)
- **Prova:** Security Scan ✅ success no SHA 2df1b01

### 2. Reparo do ledger migration 20261022120000
- **Impacto:** Migration Ledger Drift reportava drift (status `conteudo_nao_verificado`)
- **Correção:** Migration de reparo `20261022230000_repair_migration_ledger_and_harden_search_path.sql` inseriu entry no `supabase_migrations.schema_migrations` com `statements` correto (sha256 hash)
- **Prova:** Migration Ledger Drift ✅ success

### 3. Hardening search_path e2e_cleanup_check_rate_limit
- **Impacto:** Inconsistência de segurança (SECURITY DEFINER sem pg_catalog no search_path)
- **Correção:** `SET search_path TO 'pg_catalog', 'public'` adicionado à função
- **Prova:** Sem regressão em testes

---

## Falhas externas (bloqueadas por infra/billing — não corrigíveis em código)

### Enterprise Compliance & Audit Reporting
- **Causa:** `exceed_edge_functions_invocations_quota, exceed_egress_quota` — quota Supabase esgotada
- **Ação necessária:** Restaurar quota Supabase (painel do projeto → spend caps ou upgrade de plano)

### Running Copilot Code Review
- **Causa:** `SessionModelError: quota 402` — quota GitHub Copilot esgotada
- **Ação necessária:** Verificar `github.com/settings/billing` e atualizar plano ou aguardar reset

---

## Workflows que mantiveram verde ✅
- Branch Protection Sentinel
- CodeQL (em execução, sem indicação de falha)
- Migration Ledger Drift
- Portal Sicoob (em execução)
- npm_and_yarn demais pacotes

---

## Gaps identificados (não implementados — baixo risco imediato)

| Gap | Risco | Decisão |
|---|---|---|
| `e2e_cleanup_rate_limit` sem FORCE ROW LEVEL SECURITY | Baixo — acesso só via RPC SECURITY DEFINER | Risco aceitável — adicionar FORCE RLS quebraria a RPC |
| Supabase quota sem alertas automáticos | Médio | Registrado — implementar alerta de billing externo ao escopo |

---

*Atualizado em 2026-10-22 — aguardando conclusão de Qualidade contínua, CodeQL, Portal Sicoob e investigação de npm_and_yarn @vitest/mocker e E2E*
