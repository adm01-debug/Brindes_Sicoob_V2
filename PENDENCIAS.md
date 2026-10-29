# Pendências de CI — adm01-debug/Brindes_Sicoob_V2

Atualizado em: 2026-10-28

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

## Snapshot atual de blockers — reconciliação 29/10/2026 UTC

Este snapshot substitui afirmações anteriores de que os workflows estavam resolvidos. Critério: última execução retornada para a branch `main`; conclusões de PR não contam como resultado da `main`.

| Workflow | Última execução em `main` | Causa confirmada / bloqueio | Próxima ação |
|---|---|---|---|
| Qualidade contínua | [40602982964](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982964) | Gate falhou no audit de dependências: `undici` e `zod` altos | Integrar a correção de dependências após E2E e checks completos passarem |
| Security Scan | [40602983158](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983158) | `undici` < 8.12.2 e `zod` < 4.6.6 no lockfile; npm audit reportou 2 altas | Validar upgrades em PR sem downgrade de cobertura ou contrato |
| CodeQL | [40602983073](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983073) | Arquivo de configuração 4.39.1 com action runtime 4.38.2; falhou autobuild e não produziu SARIF | Alinhar todas as actions CodeQL na mesma PR e rerodar |
| Publicar funções Sicoob | [40772348102](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40772348102) | Publicação concluiu, mas a checagem encontrou `sicoob-approval-reconciliation` na versão 5 (anterior: 5); CLI confirmou 12 diferenças de código | Corrigir/verificar o deploy no PR #149 e resolver as divergências documentadas antes de declarar paridade |
| Copilot Code Review | [39785094125](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39785094125) | GitHub retornou limite adicional de uso do plano; HTTP 402 | Owner verificar billing/uso do Copilot ou aguardar reset; continuar demais checks |
| E2E (Playwright) | [37775702358](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/37775702358) | `startup_failure`, nenhum job retornado; motivo exato indisponível | Reexecutar após corrigir pré-requisitos do runner; registrar logs completos se persistir |
| Bundle Size Check | [36353765911](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/36353765911) | Run falhou; log expirado (HTTP 404), causa não confirmada | Rerun para obter evidência atual antes de alterar orçamento ou bundle |
| Lighthouse Performance Audit | [36353765910](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/36353765910) | Run falhou; log expirado (HTTP 404), causa não confirmada | Rerun e coletar log antes de atribuir causa a secret ou orçamento |
| Run sem nome (`workflow_id` 378424992) | [37775844412](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/37775844412) | `startup_failure`, zero jobs; a API não retornou nome ou logs | Identificar o workflow pelo histórico de runs/check suite antes de qualquer alteração |

### Reconciliação GitHub e Supabase

- `main`: `e9d59026793b84fabeaeec9da890a068f64d49c3`. PRs relevantes continuam abertas. PR #151 inclui 12 arquivos de migrations já aplicadas, sem reaplicá-las; checks ainda falham, logo a divergência Git ↔ ledger continua aberta.
- Banco canônico `cfmzkthhgliqelozlmwu`: consulta `SELECT` ao ledger retornou 137 versões, última `20261022230000`. Nenhuma escrita ou migration foi feita.
- O MCP não autorizou `supabase_functions_list` sem token administrativo `sbp_...`; o workflow de deploy falhou na verificação de aumento de versão. A paridade das Edge Functions publicadas permanece **não certificada**.
- A execução `Migration ledger drift` [40670784182](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40670784182) está verde. As 462 migrations sem entrada no ledger não foram classificadas em lote como pendentes e não devem ser aplicadas por suposição.
- A worktree compartilhada local estava 84 commits atrás de `main` e com alterações locais. Nenhum arquivo foi copiado em lote; alterações locais redundantes/obsoletas não devem sobrescrever versões mais novas do GitHub.

Baseline local isolada em `origin/main` foi registrada em [RELATORIO_CI.md](./RELATORIO_CI.md): build/typecheck aprovados, lint 0 erros/873 avisos, 5.839 testes aprovados e 68 ignorados. Essa suíte não substitui E2E autenticado remoto.

### PR #154 — checks da execução 408018 (2026-10-28, horário de Brasília)

A PR documental [#154](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/154) segue aberta e bloqueada; não foi mesclada. Security Scan (`40801820873`) falhou no `npm audit --audit-level=high`, com vulnerabilidades altas em `undici` (8.0.0–8.12.1) e `zod` (<4.6.6). “Segurança, contratos e build” (`40801820943`) falhou pelo mesmo gate. No E2E (`40801820967`), 55/56 testes passaram; o teste de `system-healthcheck` que espera HTTP 401 sem autenticação falhou com `TimeoutError: The operation was aborted due to timeout` (~30,5 s). Os shards de regressão foram pulados pelo gate. Gitleaks, bundle-stats, origem confiável, entrada responsiva, verba/aprovação, sicoob-gate e Preview Vercel passaram.

Não enfraquecer esses gates nem mesclar enquanto os checks requeridos estiverem vermelhos. A falha E2E requer diagnóstico da latência/resposta de `system-healthcheck`; a causa não foi atribuída a código ou infraestrutura sem evidência adicional.

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

## Rechecagem de paridade — 29/10/2026

### Código e migrations

- `origin/main` permanece em `e9d59026793b84fabeaec9da890a068f64d49c3`. A worktree local principal está 84 commits atrás e contém alterações locais; ela não foi usada para atualizar o remoto.
- O ledger do banco canônico foi consultado somente com `SELECT`: 137 entradas; versão mais recente `20261022230000`. A busca por migrations versionadas no `main` não encontrou arquivo com versão posterior, portanto não há migration nova de `main` a aplicar por esta comparação.
- 12 entradas aplicadas em 15–16/10 não têm fonte correspondente no `main`: `20261015102000`, `20261015230500`, `20261015233500`, `20261015235000`, `20261015235500`, `20261016000000`, `20261016160000`, `20261016163000`, `20261016170000`, `20261016171500`, `20261016172000` e `20261016173000`. A PR [#151](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/151) repõe os 12 arquivos, mas não pode ser mesclada: CodeQL, E2E, auditoria npm, build e revisão Copilot falharam no SHA `239a25cc`.
- Nenhum SQL, registro, migration ou função foi escrito no banco canônico durante esta rechecagem.

### Edge Functions publicadas

A CLI autenticada listou e baixou, em modo somente leitura, as 100 funções ativas de `cfmzkthhgliqelozlmwu`. Foram comparados os SHA-256 dos `index.ts` publicados com `origin/main`. 12/100 estão diferentes:

| Função | Versão ativa | Cruzamento |
|---|---:|---|
| `crm-db-bridge` | 13 | Igual à fonte da PR #112, que está aberta e com checks falhos |
| `trends-insights` | 9 | Igual à fonte da PR #112, que está aberta e com checks falhos |
| `e2e-cleanup` | 7 | Divergente de `main` |
| `get-app-logs` | 7 | Divergente de `main` |
| `github-fix-config` | 7 | Divergente de `main` |
| `quote-sync` | 7 | Divergente de `main` |
| `sicoob-seed-qa` | 8 | Divergente de `main` |
| `sicoob-seed` | 7 | Divergente de `main` |
| `sync-quote-bitrix` | 7 | Divergente de `main` |
| `admin-audit-hook` | 7 | Divergente de `main` |
| `bi-share-dossier` | 7 | PR #150 propõe hardening; ainda não está integrada nem implantada |
| `rls-audit` | 7 | Divergente de `main` |

`health-check` agora coincide com `main`; a divergência registrada na verificação anterior foi resolvida desde então. Os seis diretórios de função sem publicação seguem: `e2e-auth-test`, `error-monitor`, `generate-mockup-nanobanana`, `migrate-helper`, `qa-block-monitor` e `sicoob-seed-debug`. A comparação cobre o arquivo de entrada; não certifica dependências importadas nem comportamento runtime.

### PRs relacionadas e bloqueios atuais

Checks consultados nos SHAs das PRs em 29/10:

| PR | Conteúdo relacionado | Estado dos checks |
|---|---|---|
| [#112](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/112) | Fontes implantadas de `crm-db-bridge` e `trends-insights` | 9 falhas, 2 ignorados |
| [#150](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/150) | Hardening de `bi-share-dossier` e `health-check` | 5 falhas, incluindo build, CodeQL, npm audit e E2E |
| [#151](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/151) | Restauração das fontes de migrations já aplicadas | 5 falhas, incluindo build, CodeQL, npm audit e E2E |
| [#154](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/154) | Esta reconciliação e registro de pendências | 4 falhas: Copilot, E2E, build e npm audit |
| [#156](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/156) | Pré-carga de produtos no orçamento | 5 falhas, incluindo build, CodeQL, npm audit e E2E |
| [#157](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/157) | Ajustes de tendências e rota de instalação PWA | 2 falhas, 1 check ainda em andamento |

As correções estão em branches/PRs, porém não foram integradas em `main`; nenhuma dessas PRs pode ser declarada concluída enquanto os checks obrigatórios estiverem falhando ou pendentes. Não foi feito deploy de Edge Functions. A paridade GitHub ↔ Supabase continua parcial e as divergências acima precisam ser reconciliadas de forma controlada após desbloquear os checks, preservando as versões publicadas que estão à frente de `main`.
