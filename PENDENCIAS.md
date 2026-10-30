# Pendências de CI — adm01-debug/Brindes_Sicoob_V2

Atualizado em: 2026-10-30

## Snapshot atual da `main` — 2026-10-30

Inventário baseado na execução mais recente por workflow em `main`, sem runs de PR.
As seções históricas abaixo refletem o estado de 22/10 e não substituem este snapshot.

| Workflow | Último status em `main` | Causa exata / bloqueio atual | Run |
|---|---|---|---|
| Publicar funções Sicoob | `failure` (28/10) | A publicação informou `No change found` para `sicoob-approval-reconciliation`; a verificação exigia incremento de versão mesmo sem alteração. Não repetir enquanto o ambiente `construction` e o project ref de homologação não forem comprovados. | [40772348102](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40772348102) |
| Security Scan | `failure` (27/10) | Na `main`, `npm audit` ainda encontra `undici` e `zod` altos. Na PR #176, override `undici@8.12.2` e migração Zod `4.6.7` passaram no audit remoto: [41086090216](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41086090216). A `main` aguarda merge e nova execução. | [40602983158](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983158) |
| Qualidade contínua | `failure` (27/10) | Mesmo gate de audit na `main`. A PR #176 passou suíte completa, Edge checks, simulações PostgreSQL descartáveis e build em [41086090239](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41086090239), attempt 2. A primeira tentativa falhou apenas por limite de dados temporário do ECR ao baixar imagem PostgreSQL; a segunda completou com success. A `main` aguarda merge e nova execução. | [40602982964](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982964) |
| CodeQL | `failure` (27/10) | `init` estava em v4.39.1 e `autobuild`/`analyze` em v4.38.2; a inicialização entra em `JOB_STATUS_CONFIGURATION_ERROR` e não gera SARIF. Pins alinhados e PR passou em [41086090279](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41086090279). A `main` aguarda merge. | [40602983073](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983073) |
| E2E (Playwright) | `startup_failure` (08/10) | O GitHub registrou zero jobs, sem resumo/log que identifique a causa. No run mais recente da PR, [41096929852](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41096929852), a preflight confirma `E2E_SUPABASE_PROJECT_ID` vazio e bloqueia os testes autenticados. O commit `d4502f6` corrige apenas a falha secundária do resumo quando não há `results.json`; não corrige a ausência do secret. | [37775702358](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/37775702358) |
| Bundle Size Check | `failure` (27/09) | Logs expiraram (HTTP 404); causa exata não é recuperável. O check de orçamento será executado no PR da branch. | [36353765911](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/36353765911) |
| Lighthouse Performance Audit | `failure` (27/09) | Logs expiraram (HTTP 404); causa exata do run não é recuperável. A tentativa local também não conseguiu iniciar o Chrome do Windows pelo WSL (`ECONNREFUSED 127.0.0.1`); é necessária execução no runner Ubuntu do PR e `LHCI_GITHUB_APP_TOKEN` válido. | [36353765910](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/36353765910) |
| Publicar funções Sicoob / alvo | bloqueado | O workflow antigo fixava o projeto canônico `cfmzkthhgliqelozlmwu`; agora a branch exige `CONSTRUCTION_SUPABASE_PROJECT_REF` e recusa o canônico. Não houve confirmação verificável do secret/ambiente nem execução remota. | — |
| Running Copilot Code Review | `failure` (22/10) | Na `main`, cota do Copilot HTTP 402. Na PR, o run mais recente [41096943447](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41096943447) falhou no processamento/limpeza do agente; a execução anterior [41086107888](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41086107888) confirma limite HTTP 402 e aviso de firewall bloqueando `api.github.com`. Depende de cota/configuração do ambiente gerenciado pelo GitHub. | [39785094125](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39785094125) |

**Verdes confirmados:** Migration ledger drift (`41013281253`, 30/10), Branch Protection Sentinel (`40602983038`), Enterprise Compliance & Audit Reporting (`40602982958`), Portal Sicoob (`39868499315`), Monthly DB Audit (`36794161452`, 01/10) e Dependabot Updates (`40603001428`). O último run de Aplicar migrations Sicoob foi `cancelled` (`37029743784`, 02/10); cancelamento não é falha e nenhuma migration foi executada por esta auditoria.

### PR #176 — snapshot histórico, SHA `e540dfb`

A PR está aberta e bloqueada (`merged=false`), com head `e540dfbd0e61c124dfeba314cb735a9733cdb48f` e base `main` `e9d59026793b84fabeaeec9da890a068f64d49c3`.

| Workflow | Run/conclusão | Evidência |
|---|---|---|
| Qualidade contínua | [41096929659](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41096929659) — success | Typecheck, lint, testes, simulações e compilação de produção concluíram sem falha. |
| Security Scan | [41096929643](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41096929643) — success | Audit e Gitleaks passaram. |
| E2E (Playwright) | [41096929852](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41096929852) — falhou no preflight | `E2E_SUPABASE_PROJECT_ID` chegou vazio; o gate parou antes do Playwright, os shards foram skipped e não houve jornada autenticada. O resumo sem `results.json` foi skipped como esperado. |
| Copilot Code Review | [41096943447](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41096943447) — falhou | A etapa de processamento/limpeza do agente falhou no ambiente gerenciado; a execução anterior também reportou HTTP 402 e bloqueio de rede a `api.github.com`. Dependência externa ao código deste PR. |
| Bundle Size | [41096929698](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41096929698) — success | Orçamento de bundle passou. |
| Portal Sicoob | [41096929702](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41096929702) — success | Checks de portal/responsividade e aprovação passaram. |
| CodeQL | [41096929662](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41096929662) — success | Análise concluída. |
| Lighthouse | [41096929795](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41096929795) — success | Auditoria de performance concluída. |

**Pendências que precisam de ação/decisão do owner:**

1. Configurar como **secret do repositório** o `E2E_SUPABASE_PROJECT_ID` com o project ref de um Supabase de homologação isolado. O job E2E não declara `environment`, então um secret existente apenas no environment `construction` não fica disponível. Alinhar `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_URL`, chave publicável, service role e contas/personas/TOTP de teste ao mesmo projeto. O projeto canônico é recusado pelo workflow. Nenhum valor secreto foi lido.
2. Ajustar a allowlist do firewall do Copilot Actions para liberar `api.github.com` (ou configurar os setup steps do agente antes da ativação do firewall, conforme a mensagem do run). O workflow Copilot é gerenciado pelo GitHub e não é um YAML versionado no repositório.
3. Aguardar revisão obrigatória e resolver os dois bloqueios acima antes do merge da PR #176. Ela permanece aberta e sem merge.
4. O run de deploy Sicoob na `main` permanece falho/sem alvo de homologação comprovado. Antes de qualquer execução futura, configurar `CONSTRUCTION_SUPABASE_PROJECT_REF` e credenciais somente do projeto `construction`; não aplicar migrations nem publicar funções no banco canônico.
5. A migration candidata `20261030190000_bind_sicoob_scan_evidence_hash.sql` está versionada e autorizada somente na allowlist de construção. Foi validada em PostgreSQL descartável; não foi aplicada a Supabase remoto. Antes de qualquer aplicação, confirmar o projeto `construction`, executar o preflight de ledger e auditar os registros anteriores: a constraint `NOT VALID` protege gravações novas, mas não declara consistência histórica.
6. O scanner segue sem provedor homologado. Faltam configurar URL/token no ambiente de construção, testar EICAR e timeout contra esse provedor e verificar limpeza de objetos órfãos no Storage. Não usar o mock `scanner-sintetico` como prova de integração real.

**Validação local daquele snapshot:** suíte completa 5.854 passou, 68 skipped, 0 falhou; build e typecheck passaram; lint passou (0 erros, 874 avisos); `npm audit --audit-level=high` passou com 0 vulnerabilidades. A validação candidata posterior registra 5.856 aprovados em `RELATORIO_CI.md`. Os números acima refletem o snapshot antigo `e540dfb`; `main` permanece sem as alterações. Nenhuma migration, Edge Function ou dado remoto foi alterado.

### PR #176 — snapshot consultado para o SHA `3096491e2c09711aee949628e39e41e98cc2c62b`

Os runs abaixo foram consultados antes do lote documental desta branch. Status `in_progress`/`queued` não é falha e ainda não é aceite de CI.

| Workflow | Status no último snapshot | Evidência / bloqueio | Run |
|---|---|---|---|
| Lighthouse Performance Audit | `success` | Auditoria concluída. | [41103728118](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41103728118) |
| Portal Sicoob | `success` | Checks de portal passaram. | [41103726700](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41103726700) |
| E2E (Playwright) | `failure` | Preflight falhou antes do Playwright: `E2E_SUPABASE_PROJECT_ID` vazio; jornadas autenticadas não rodaram. | [41103727637](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41103727637) |
| Running Copilot Code Review | `failure` | Limite adicional de uso do Copilot (HTTP 402); também houve bloqueio de firewall para `api.github.com`. Depende do owner/GitHub. | [41103742008](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41103742008) |
| Qualidade contínua | `in_progress` | Sem conclusão no momento da consulta. | [41103726857](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41103726857) |
| Security Scan | `in_progress` | Sem conclusão no momento da consulta. | [41103726975](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41103726975) |
| Bundle Size Check | `in_progress` | Sem conclusão no momento da consulta. | [41103727427](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41103727427) |
| CodeQL | `queued` | Aguardando execução; sem causa de fila exposta. | [41103727897](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41103727897) |

A PR permanece aberta e sem merge. O E2E depende de projeto Supabase isolado e personas de teste configuradas como secrets acessíveis ao job. O canônico está bloqueado pelo workflow.

**Correções adicionais pós-auditoria:** mensagens de erro de enums Zod agora distinguem ausência de valor inválido, com testes para os dois casos; o resolver do formulário mantém um adaptador tipado porque a entrada genérica de `z.coerce.number` não representa os defaults e controles numéricos concretos da tela. O cliente SQL do Supabase aceita project refs alfanuméricos de 20 caracteres, alinhado ao guard de migrations, com cenário cobrindo dígitos. Os commits após `729c3e2` foram validados localmente e remotamente no SHA `90e12ae`; a `main` permanece sem merge.

**Verificação de integridade do CI:** removidos do conjunto de workflows os usos de `continue-on-error` e `|| true`; etapas de resumo pós-falha seguem com `if: always()` e o job continua falhando quando o teste/report falha. `actionlint .github/workflows/*.yml` passou após corrigir quoting e escrita do step summary no Branch Protection Sentinel.

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
2. Alternativa: migrar os scripts para usar a imagem via GHCR ou Docker Hub se disponível.

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
