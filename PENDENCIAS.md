# Pendências de CI — adm01-debug/Brindes_Sicoob_V2

Atualizado em: 2026-10-29

Cada seção abaixo registra uma falha ainda aberta, uma dependência externa ou uma causa
que não pôde ser recuperada. O snapshot cobre a última execução por workflow encontrada
na `main`; registros históricos mais antigos permanecem abaixo como contexto.

## Snapshot dos bloqueios — última execução na main (2026-10-29)

| Workflow | Último run | Estado e ação |
|---|---|---|
| `Publicar funções Sicoob` | [40772348102](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40772348102) | `failure`: `sicoob-approval-reconciliation` permaneceu na versão 5 (anterior 5). PR #161 permite versão igual sem mudança; não reexecutar deploy remoto sem autorização, pois altera Edge Functions do projeto. |
| `Security Scan` | [40602983158](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983158) | `failure`: `npm audit` encontrou duas vulnerabilidades altas em `undici` e `zod`; correções na PR #161. |
| `Qualidade contínua` | [40602982964](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982964) | `failure`: mesmo `npm audit` (`undici`, `zod`); correções na PR #161. |
| `CodeQL` | [40602983073](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983073) | `failure`: versões SHA diferentes entre `init` e `analyze`; alinhamento na PR #161. |
| `E2E (Playwright)` | [37775702358](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/37775702358) | `startup_failure`, sem jobs recuperáveis. Na PR #161, [run 40881949980](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40881949980) falhou no preflight porque os quatro secrets `E2E_SUPABASE_*` estão vazios; o owner informou que vai configurá-los. |
| Run sem workflow identificável | [37775844412](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/37775844412) | `startup_failure`; a API retorna `name` vazio e `path=BuildFailed`, sem jobs/logs para determinar workflow ou causa. |
| `Running Copilot Code Review` | [39785094125](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39785094125) | `failure`: log confirma limite adicional do Copilot, HTTP 402. Depende do owner/plano. |
| `Bundle Size Check` | [36353765911](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/36353765911) | `failure`; logs expiraram e a causa não é recuperável. `bundle-stats` equivalente na PR #161 passou, mas não valida um rerun deste workflow. |
| `Lighthouse Performance Audit` | [36353765910](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/36353765910) | `failure`; logs expiraram e a causa não é recuperável. Lighthouse passou na PR #161. |
| Dependabot `@vitest/mocker` | [39775463512](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39775463512) | Execução de update histórica falhou; pacote já atualizado em PR #139. Confirmar fechamento do alerta stale no Dependabot. |

Verdes no mesmo snapshot: `Migration ledger drift` (40828393693), `Enterprise
Compliance & Audit Reporting` (40602982958) e `Branch Protection Sentinel`
(40602983038). `Portal Sicoob` (39868499315), `Monthly DB Audit` (36794161452) e
o update Dependabot de `undici` (40603001428) também tiveram última conclusão
`success`. `Aplicar migrations Sicoob` ficou `cancelled`, portanto não é falha.

## Atualização da PR #161 — head `f06dd5de` (2026-10-29)

- [E2E run 40881949980](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40881949980): os quatro secrets `E2E_SUPABASE_*` não aparecem na listagem de secrets do repositório (nomes consultados, sem leitura de valores). O owner informou que vai configurá-los. Não usar credenciais do banco canônico para substituir a homologação.
- [Build/contratos run 40881951013](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40881951013): attempts 1 e 2 falharam após três tentativas locais por execução, devido ao limite externo de dados do ECR (`toomanyrequests: Data limit exceeded`) ao baixar `public.ecr.aws/supabase/postgres:17.6.1.063`. Um run anterior passou no attempt 2; evitar reruns sem mudança de quota/cache.
- [Copilot review run 40881966476](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40881966476): limite de uso Copilot HTTP 402; depende do plano/owner.
- `sicoob-gate`, responsivo, CodeQL, bundle-stats, npm audit, Lighthouse, Gitleaks e Vercel Preview passaram no head atual.

**Ação pendente do owner:** provisionar projeto Supabase isolado de homologação e configurar no GitHub Actions `E2E_SUPABASE_URL`, `E2E_SUPABASE_PUBLISHABLE_KEY`, `E2E_SUPABASE_PROJECT_ID` e `E2E_SUPABASE_SERVICE_ROLE_KEY`, todos do mesmo projeto. Também manter contas E2E válidas nesse projeto. Após concluir, avisar para verificarmos presença dos nomes e rerodarmos o E2E. Nunca enviar valores de secrets pela conversa.

## Auditoria somente leitura do ledger Supabase — 2026-10-29

Consulta ao MCP do projeto Brindes Sicoob: `supabase_migrations.schema_migrations`
contém 137 versões, da `001` até `20261022230000`. Nove linhas antigas têm
`name = NULL`, mas a fonte local correspondente existe pela versão; isso não foi
contado como ausência.

| Referência | Arquivos SQL | Fontes para versões do ledger | Arquivos sem registro no ledger |
|---|---:|---:|---:|
| `origin/main` (`e9d5902679`) | 587 | 125/137 — faltam 12 arquivos aplicados | 462 |
| PR #151, `fix/hermes-ledger-sources-20261028` (`239a25cc`) | 599 | 137/137 | 462 |
| Checkout principal local (`main`, `6b71bdc09`) | 530 presentes | 68/137 — faltam 69 fontes | 462 |

A PR [#151](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/151) restaura
as 12 fontes aplicadas que não existem em `main`, sem executar SQL. Ela continua
aberta e bloqueada por checks; a reconciliação ainda não chegou à branch padrão.
O checkout principal está 84 commits atrás de `origin/main`, com 57 arquivos de
migration removidos localmente sem commit. Ele foi inspecionado sem alterações.
As 462 migrations locais sem registro são passivo histórico já classificado em
[`retomada-mcp-20260922.md`](docs/execucao/retomada-mcp-20260922.md); ausência no
ledger não prova ausência de objetos no schema e não autoriza aplicação automática.

Nenhuma migration foi aplicada ou reparada durante esta auditoria. A comparação
validou somente a presença de fontes/versões; não comprova igualdade semântica de
todo o schema nem substitui o CI da PR #151.

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

### Atualização de 2026-10-29 — execução autenticada/RLS na PR #161

**Run:** `40875124915` · **Job:** `123451904072` · [execução no GitHub](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40875124915/job/123451904072)

O job `e2e` ficou bloqueado nos hooks `beforeAll` e `afterAll` do teste
`tests/rls/e2e-cleanup-rate-limit.test.ts`: as chamadas de inserção e limpeza do canário
em `e2e_cleanup_rate_limit` excederam `45000ms` (`Hook timed out in 45000ms`). A execução
anterior usava secrets genéricas `VITE_SUPABASE_*` e `SUPABASE_SERVICE_ROLE_KEY`; como
seus valores são mascarados, não foi possível confirmar se URL, chave administrativa,
projeto, conectividade, quota e schema pertenciam ao mesmo ambiente de homologação.

**Correção preparada na PR #161:** o workflow passa a exigir secrets E2E separadas
(`E2E_SUPABASE_URL`, `E2E_SUPABASE_PUBLISHABLE_KEY`, `E2E_SUPABASE_PROJECT_ID` e
`E2E_SUPABASE_SERVICE_ROLE_KEY`), mapeia-as às variáveis esperadas pelo app/testes e
valida que a URL HTTPS corresponde ao project ref configurado. Os secrets genéricos do
projeto não são usados pelo job E2E.

**Ação do owner:** criar/configurar no GitHub Actions os quatro secrets acima com URL,
project ref, chave publicável e service role do mesmo projeto de homologação; também
confirmar que `e2e_cleanup_rate_limit`, suas políticas e as contas E2E existem nesse
projeto. Depois que os checks da PR atualizarem com o workflow corrigido, reexecutar o E2E
autenticado/RLS. Nenhum valor de secret deve ser enviado pela conversa.

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

**Run recente da PR #161:** [40878723112](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40878723112) falhou no primeiro attempt ao baixar `public.ecr.aws/supabase/postgres:17.6.1.063` com `toomanyrequests: Data limit exceeded`. O attempt 2 do mesmo run concluiu `success`; rate limit transitório, sem mudança de código.

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
