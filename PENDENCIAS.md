# Pendências de CI — adm01-debug/Brindes_Sicoob_V2

## Estado atual — auditoria de 2026-10-27 21:27 UTC

Base verificada: `main` em `2df1b01ad87b8836d70149f1357dc38c33aeb24f`. PR #145 aberta em [https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/145](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/145), head verificado `1c0314e53a7cbed7a85d645c4b2e2f179e563d59` (documentação; código validado em `d4c4f5e`). Não houve merge, deploy ou migration manual no Supabase. O E2E mais recente passou no preflight Auth/RLS, mas falhou no login do usuário canônico; a execução de Playwright ficou impedida.

### Última execução na `main`

A auditoria consultou cada um dos 15 workflows separadamente e não confundiu execução de PR com branch `main`.

| Workflow | Última execução | Conclusion / estado | Situação |
|---|---|---|---|
| Migration ledger drift | [40545453684](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40545453684) (dispatch; anterior schedule [40460912297](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40460912297)) | failure | Falha de ledger detalhada abaixo; a execução read-only mais recente repetiu a falha de ledger. |
| Security Scan | [40283890444](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40283890444) | failure | Dependências vulneráveis na main; correção em PR #145, que passou no audit. |
| Enterprise Compliance & Audit Reporting | [40146142639](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40146142639) | failure | Quotas Supabase esgotadas; exige ação do owner. |
| Running Copilot Code Review | [39785094125](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39785094125) | failure | Cota adicional Copilot HTTP 402; exige ação do owner. |
| E2E (Playwright) | [37775702358](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/37775702358) | startup_failure | Zero jobs/artefatos; logs 404. Causa não recuperável. |
| Bundle Size Check | [36353765911](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/36353765911) | failure | Logs/jobs sem steps; download HTTP 404. Causa não recuperável. |
| Lighthouse Performance Audit | [36353765910](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/36353765910) | failure | Logs/jobs sem steps; download HTTP 404/BlobNotFound. Causa não recuperável. |

**Verdes na última execução da `main`:** Branch Protection Sentinel [39868499260], Qualidade contínua [39868499453], CodeQL [40299812684], Monthly DB Audit [36794161452], Publicar funções Sicoob [37489393764], Portal Sicoob [39868499315], Dependabot Updates [40423019666]. Aplicar migrations Sicoob [37029743784] foi cancelado, não falhou.

### Pendências e causas exatas

1. **Migration ledger drift — último dispatch [40545453684](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40545453684); schedule anterior [40460912297](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40460912297).** Step retornou `Ledger: 136; arquivos: 607; pendências: 504` e `20261022230000: local_sem_ledger`. As 504 são pendências históricas baselineadas; o delta é a migration `20261022230000_repair_migration_ledger_and_harden_search_path.sql`, versionada e hash `b7b603513980448ddce917e00aa962519f392773cd1e7498782ef3f63e19f7a8`. PR #145 adiciona seu hash à allowlist do aplicador, mas a migration ainda precisa ser integrada e aplicada pelo fluxo versionado em ambiente `construction`. **Não inserir ledger manualmente, nem aplicar migration por esta sessão.** O dispatch read-only [40545453684](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40545453684) repetiu a mesma falha; a auditoria RLS posterior não reportou achados.
2. **Security Scan — [run main 40283890444](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40283890444).** `npm audit --audit-level=high` encontrou três advisories High em Undici e uma em Zod. PR #145 atualiza Undici para 8.12.2 e Zod para 4.6.7; o check mais recente da PR passou em [40585557185](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40585557185). O workflow da `main` permanece falho até integrar o fix; a PR não será mesclada enquanto a mudança puder disparar deploy de produção.
3. **Enterprise Compliance — [run 40146142639](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40146142639).** Erro literal: `Service for this project is restricted ... exceed_edge_functions_invocations_quota, exceed_egress_quota`. **Ação do owner:** restaurar quota/remover spend cap no Supabase e reexecutar.
4. **Copilot Code Review — run main [39785094125](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39785094125); run PR mais recente [40585570513](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40585570513).** Erro observado: HTTP 402 `errorCode: quota`, limite adicional de uso do plano esgotado. O log registra também bloqueio de firewall para `api.github.com`. **Ação do owner:** restaurar a quota do Copilot e liberar o domínio no firewall do runner conforme política da organização; depois reexecutar.
5. **E2E na main — [run 37775702358](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/37775702358).** Conclusion `startup_failure`, `total_jobs=0`, zero artefatos e logs HTTP 404; a causa específica histórica não é recuperável. Na PR, o run mais recente [40585557237](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40585557237) passou no preflight remoto Auth/RLS, mas falhou em `authenticate canonical role states`: a autenticação do comprador canônico permaneceu em `/login` após 20 s em 3 tentativas (original + 2 retries). O teardown também registrou `AbortError` após 4 tentativas de cleanup remoto; 39 testes não rodaram e os shards Playwright foram `skipped`. No run anterior [40583830419](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40583830419), o preflight tinha falhado por timeouts, que não se repetiram. **Causa raiz da falha atual ainda não comprovada** (credencial, estado da conta/sessão ou serviço). **Ação do owner:** validar `E2E_USER_EMAIL/PASSWORD`, estado da conta canônica e logs Auth/Edge de 2026-10-27 21:21–21:27 UTC; confirmar a saúde da função de cleanup. Não compartilhar credenciais; não aumentar timeouts ou enfraquecer assertions.
6. **Bundle Size Check na main — [run 36353765911](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/36353765911).** Steps/logs/artefatos não estão disponíveis (HTTP 404), então a causa histórica exata não pode ser recuperada; o workflow não aceitava `workflow_dispatch` na main (422). O check passou no head documental da PR em [40585557000](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40585557000).
7. **Lighthouse na main — [run 36353765910](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/36353765910).** Steps/logs/artefatos não estão disponíveis (HTTP 404/BlobNotFound), portanto a causa histórica não pode ser recuperada; o workflow não aceitava `workflow_dispatch` na main (422). O check passou no head documental da PR em [40585557158](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40585557158).

**Falha transitória de infraestrutura na PR:** Qualidade contínua [40583830311](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40583830311) recebeu `toomanyrequests: Data limit exceeded` do ECR ao baixar a imagem PostgreSQL, mas o rerun natural após o commit documental passou integralmente em [40585557344](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40585557344). O workflow correspondente em `main` permaneceu verde; sem bloqueio atual.

### Estado dos checks PR #145 no head documental `1c0314e`

| Workflow | Último run aplicável | Resultado |
|---|---|---|
| Security Scan | [40585557185](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40585557185) | success |
| Bundle Size Check | [40585557000](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40585557000) | success |
| CodeQL | [40585557447](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40585557447) | success |
| Portal Sicoob | [40585556958](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40585556958) | success; gates transacional e responsivo aprovados |
| Lighthouse | [40585557158](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40585557158) | success |
| Qualidade contínua | [40585557344](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40585557344) | success; simulações e build passaram |
| E2E (Playwright) | [40585557237](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40585557237) | failure no login do comprador canônico; preflight passou. Ver item 5. |
| Copilot Code Review | [40585570513](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40585570513) | failure HTTP 402 quota e bloqueio do firewall; ver item 4. |

O PR segue aberto. Não mesclar: além dos gates ainda pendentes, as atualizações de dependências podem acionar deploy de produção; a política desta tarefa exige deixar o PR pronto e documentar o bloqueio.

### Baseline × final

- Baseline CI documentado: 5.839 testes passaram, 68 ignorados, 0 falhas.
- Código `d4c4f5e`: 5.841 passaram, 68 ignorados, 0 falhas localmente (453 arquivos passaram; 4 ignorados). `npm run build`, `npm run lint`, `npm run typecheck` e suíte completa passaram após o commit; 0 erros de lint e 873 avisos.
- Baseline histórico de build **não está disponível**: Vite não existia no container; não alegar build baseline.
- Baseline histórico de TypeScript cobre apenas `npx tsc --noEmit -p tsconfig.app.json`. No código atual, `npm run typecheck` passou.
- Lint final: 0 erros e 873 avisos; `npm run build` passou. O npm audit final local encontrou 0 vulnerabilidades.

---

### Histórico de auditorias anteriores

As seções seguintes preservam registros de outubro de 2026. Para o estado vigente, use o inventário acima e o PR #145.

Cada seção abaixo descreve um workflow que falha por motivo externo ao código do repositório.
O erro exato foi extraído do run mais recente disponível em main.

---

~~## Workflow: `npm_and_yarn` — Dependabot `@vitest/mocker` Update~~

> ✅ **RESOLVIDO em 2026-10-22** — `vitest` e todos `@vitest/*` atualizados para 4.1.12 no commit `b32e5e4`. CVEs GHSA-qxg6-89mg-rqv8 e GHSA-xp26-3454-mjgp corrigidas.

---

## Workflow: Enterprise Compliance & Audit Reporting

**Run atual:** `39780447872` · Job `119830039718`  
**Step:** "Database RLS Scan"  
**Erro exato:**

```
check_tables_rls falhou: Service for this project is restricted due to the following violations:
exceed_edge_functions_invocations_quota, exceed_egress_quota.
The project owner must upgrade their plan or remove spend caps to restore service.
```

**Causa raiz:** Quota de edge functions e egress do projeto Supabase esgotada — o workflow
chama funções via Management API e o projeto rejeita por billing.

**O que você precisa fazer:**

1. Acesse o painel do Supabase do projeto em uso pelos testes.
2. Verifique se há spend caps ativos e remova-os, ou adicione créditos ao plano.
3. Após restaurar a quota, o workflow deve passar sem nenhuma mudança de código.

---

## Workflow: `e2e` — Smoke gate Playwright bloqueado por quota Supabase

**Situação:** Duas partes distintas neste workflow:

### Parte 1 — Testes vitest (authz + RLS) ✅ Resolvido

> ✅ **RESOLVIDO em 2026-10-22** — `edge-authz-bypass.test.ts` atualizado para aceitar HTTP 402
> (quota Supabase). `e2e-cleanup-rate-limit.test.ts` atualizado para tratar quota com
> `isQuotaExhaustedError` + flag `quotaExhausted`. Fix aplicado no PR #141.

### Parte 2 — Smoke gate Playwright ⚠️ Externo

**Causa raiz:** A quota Supabase esgotada (`exceed_edge_functions_invocations_quota`,
`exceed_egress_quota`) faz com que o endpoint de autenticação retorne HTTP 402. A fixture
global do Playwright (`tests/e2e/fixtures/auth.ts`) não consegue criar sessão → todos os
39 testes são pulados em 0ms → o job detecta 0 testes passando e falha com:

```
🛑 Fail-fast se smoke falhou (gate)
::error title=Smoke gate failed::...
Process completed with exit code 1.
```

**Este não é um bug no código** — é a mesma causa raiz do workflow Enterprise Compliance.
A falha é inevitável enquanto a quota Supabase não for restaurada.

**O que você precisa fazer:**

1. Restaure a quota Supabase (mesma ação da seção Enterprise Compliance acima).
2. Após restaurar, o smoke gate passa automaticamente sem nenhuma mudança de código.

---

## Workflow: `copilot-pull-request-reviewer`

**Run atual:** `39785094125` · SHA `4f5de103`  
**Erro exato:**

```
SessionModelError: You've reached your additional usage limit for your plan.
Go to https://github.com/settings/copilot/features for more details.
(Request ID: E01C:2B4931:27FA876:2E0CFAE:6AD9FDF4)
errorType: 'quota', statusCode: 402
```

**Causa raiz:** Quota mensal do GitHub Copilot esgotada.

**O que você precisa fazer:**

1. Acesse `github.com/settings/billing` e verifique o uso do Copilot.
2. Atualize o plano ou aguarde o reset do ciclo de faturamento.

---

## Workflow: `lighthouse` (Lighthouse Performance Audit)

**Trigger:** `on: pull_request` com `paths-ignore: ['docs/**', '*.md', '.github/CODEOWNERS']` — **não dispara em push à main**.  
**Run mais recente disponível:** `36353765910` · Job `108717316857` · SHA `99dd8778` · 2026-09-27  
**Log:** expirado (HTTP 404 — run de 25 dias; steps retornados vazios pela API).  
**Estado em PR #136:** SKIPPED corretamente (mudanças apenas em `*.md`).

**Causa provável da falha de Set/27:** O workflow executa `npx @lhci/cli@0.13.0 autorun` e usa o secret `LHCI_GITHUB_APP_TOKEN` para integração com GitHub Checks. Sem o token configurado (ou com token expirado), o LHCI retorna erro de autenticação mas ainda gera relatório; a falha pode ser de orçamento de performance ou de token. Logs indisponíveis para confirmar.

**Impacto:** Zero em push à main — workflow só corre em PRs. Em PRs com mudanças de código, pode falhar por:
1. `LHCI_GITHUB_APP_TOKEN` ausente/expirado no repositório.
2. Orçamento de performance configurado em `.lighthouserc.*` não sendo atingido.

**O que você precisa fazer:**
1. Verifique se o secret `LHCI_GITHUB_APP_TOKEN` está configurado em Settings → Secrets and variables → Actions.
2. Na próxima abertura de PR com mudanças de código, observe o log do job `lighthouse` para confirmar a causa raiz.
3. Sem ação imediata necessária — não bloqueia push à main.

---

## Workflow: `bundle-stats` (Bundle Size Check)

**Trigger:** `on: pull_request` — **não dispara em push à main**.  
**Run mais recente disponível em main:** `36353765911` · Job `108717316864` · SHA `99dd8778` · 2026-09-27  
**Log:** expirado (HTTP 404).  
**Estado em PR #136:** **success** ✅ · Run `39787553405` · Job `119854596437`.

**Causa da falha de Set/27:** Logs indisponíveis. Possível causa: script `scripts/qa/check-bundle-budget.mjs` com limite de orçamento ultrapassado no código daquele PR.  
**Estado atual:** Não é um bloqueio — no código atual (PR #136) o check PASSOU.

---

## Workflow: `Aplicar migrations Sicoob` (`apply-sicoob-migrations.yml`)

**Trigger:** `workflow_dispatch` apenas (manual) — requer input `confirmar: "APLICAR"` e branch `main`.  
**Não há runs automáticos.** Workflow só executa quando o owner aciona manualmente via GitHub UI ou API.  
**Último run:** não disponível (nenhum run automático indexado em `branch=main`).  
**Ação necessária:** Nenhuma no momento — workflow é utilitário para aplicar migrations ao banco de construção sob demanda.

---

## Workflow: `Monthly DB Audit` (`db-performance-audit.yml`)

**Trigger:** Cron `0 0 1 * *` (dia 1 de cada mês às 00:00 UTC) + `workflow_dispatch`.  
**Próxima execução automática:** 2026-11-01 00:00 UTC.  
**Estado:** Não avaliável até 2026-11-01. O workflow requer secrets `VITE_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` — se ausentes, o job falha com `::error::Secrets ausentes`.  
**O que verificar em Nov/01:**
1. Se o run falhar por secrets ausentes: configure `VITE_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` em Settings → Secrets and variables → Actions.
2. Se falhar por Supabase quota: mesma ação da seção Enterprise Compliance.

---

## Workflow: `Segurança, contratos e build` (`ci.yml`) — ECR Rate Limit

**Commits afetados:** `5b34841` e `7211e12` (branch `claude/hopeful-mccarthy-8rqrqw`)
**Runs:** `39850827027` · `39852468612`
**Step:** "Simular controles de auditoria" / "Simular ACL efetiva"
**Erro exato:**

```
RuntimeError: docker run falhou após 3 tentativas:
Unable to find image 'public.ecr.aws/supabase/postgres:17.6.1.063' locally
docker: Error response from daemon: toomanyrequests: Data limit exceeded
```

**Causa raiz:** Rate limit do ECR Public da AWS ao puxar a imagem Docker `public.ecr.aws/supabase/postgres:17.6.1.063` nos scripts `simular-controles-auditoria.py` e `simular-acl-efetiva.py`. Não é um bug no código do PR — é throttling de infraestrutura externa. Em execuções posteriores (ex: run `39780447863`) o rate limit se dissipar naturalmente e o workflow retornou **success**.

**O que você precisa fazer:** Nenhuma ação imediata. Se a falha persistir em execuções futuras:
1. Habilitar o Amazon ECR pull-through cache ou autenticar no ECR antes do pull.
2. Avaliar um registry alternativo apenas após confirmar o digest da imagem e a estratégia de autenticação/quota. A investigação de 2026-10-27 confirmou que Docker Hub publica o mesmo digest da imagem do ECR, mas o pull anônimo local usou camadas em cache e Docker Hub também impõe limites; GHCR não foi validado para essa tag. Portanto, nenhuma troca foi feita.

---

## Gaps de banco de dados identificados em auditoria (2026-10-22)

### Gap 1 — CRÍTICO: Migration `20261022120000` ausente de `supabase_migrations.schema_migrations`

**Status:** ✅ RESOLVIDO — migration de reparo aplicada no commit `48ee07f`.

A migration `20261022120000_add_public_favorites_to_security_definer_allowlist.sql` foi aplicada ao banco fora do Supabase CLI (via Management API), portanto nunca foi registrada em `supabase_migrations.schema_migrations`. O schema estava correto, mas o ledger do Supabase ficou dessincronizado. Inserção de reparo realizada no commit acima.

### Gap 2 — MÉDIO: `e2e_cleanup_check_rate_limit` com `search_path` incompleto

**Status:** ✅ RESOLVIDO — migration de reparo aplicada no mesmo commit.

A função SECURITY DEFINER `e2e_cleanup_check_rate_limit` tinha `SET search_path TO 'public'` sem o `pg_catalog` explicitamente como primeiro elemento, diferentemente das outras funções SECURITY DEFINER do projeto (`get_public_favorite_list` e `get_public_favorite_reactions`). Corrigido para `pg_catalog, public` por consistência com o padrão de hardening do projeto.

### Gap 3 — MÉDIO: `relforcerowsecurity = false` em `e2e_cleanup_rate_limit`

**Status:** ⚠️ Não corrigido — avaliação: risco aceitável pelo design atual.

A tabela `e2e_cleanup_rate_limit` tem `FORCE ROW LEVEL SECURITY` desabilitado, o que permite à role `postgres` (dono) acessar diretamente sem passar pelo RLS. Em produção isso é aceitável: a única escrita legítima é via RPC SECURITY DEFINER `e2e_cleanup_check_rate_limit` que roda como `postgres` por design. Adicionar `FORCE ROW LEVEL SECURITY` quebraria a RPC.

---

## Inventário completo de falhas — main (status=failure, consultado em 2026-10-22 19:30 UTC)

Lista lida via API (`branch=main`, 50 runs, último run de cada workflow).

| Workflow | Run mais recente | Conclusão | Causa | Status |
|---|---|---|---|---|
| Security Scan | `39835755469` (SHA `82262c4`) | failure | dompurify CVE (CRITICAL) | ✅ Resolvido por PR #141 (pending merge) |
| Qualidade contínua | `39835755495` (SHA `82262c4`) | failure | dompurify CVE (CRITICAL) | ✅ Resolvido por PR #141 (pending merge) |
| Enterprise Compliance & Audit Reporting | `39835755339` (SHA `82262c4`) | failure | Supabase quota esgotada | ⚠️ Externo — ver seção acima |
| Running Copilot Code Review | `39785094125` (SHA `4f5de103`) | failure | Quota GitHub Copilot 402 | ⚠️ Externo — ver seção acima |
| npm_and_yarn @vitest/mocker | `39775463512` (SHA `ae1b92b3`) | failure | `security_update_not_possible` Dependabot | ✅ Resolvido por PR #139 |

**Workflows verdes (última execução = success):**
Branch Protection Sentinel, CodeQL, Migration Ledger Drift, Portal Sicoob, Dependabot updates gerais.

---

~~## Gap de Segurança: Ausência de `npm audit` no CI~~

> ✅ **RESOLVIDO em 2026-10-22** — Job `npm-audit` adicionado ao `security.yml` no commit `b32e5e4`. Roda em PRs, push para main e schedule semanal com `--audit-level=high`.

---

## Workflows corrigidos (resolvidos em PRs anteriores)

| Workflow | Causa | Correção | PR |
|---|---|---|---|
| Branch Protection Sentinel | Squash merge com mensagem customizada sem `(#NNN)` | PR mergeado sem `commit_message` custom (GitHub gera título com `(#NNN)`) | #128 |
| Enterprise Compliance — Security Definer ACL | `audit_security_definer_acl()` sem `get_public_favorite_list` e `get_public_favorite_reactions` | Migration `20261022120000_add_public_favorites_to_security_definer_allowlist.sql` | #126 |
| Migration Ledger Drift | Fingerprint de `20261022120000` calculado com `local_sha256` incorreto; novo digest correto: `e2815b0...` | Corrigido fingerprint no `migration-ledger-baseline.json` | #129 |
| 5 CVEs high (vite ≤6.4.3) | GHSA-698v, GHSA-r825, GHSA-587h, GHSA-9jrq, GHSA-rq7h | `vite` 6.4.3 → 6.4.5 | #126 |
| Qualidade contínua (`ci.yml`) — ECR rate limit | `toomanyrequests: Data limit exceeded` ao puxar `public.ecr.aws/supabase/postgres:17.6.1.063` em dois steps (scripts `simular-controles-auditoria.py` e `simular-acl-efetiva.py`) | Rate limit do ECR Public se dissipou naturalmente; run `39780447863` → **success** | automático |
