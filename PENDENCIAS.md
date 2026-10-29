# Pendências de CI — adm01-debug/Brindes_Sicoob_V2

Atualizado em: 2026-10-22

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

---

## Revalidação de workflows — 2026-10-29

Inventário da `main` no SHA `e9d59026793b84fabeaeec9da890a068f64d49c3`, considerando somente a execução mais recente encontrada por workflow:

| Workflow | Última execução | Conclusão | Causa comprovada / estado |
|---|---:|---|---|
| [Publicar funções Sicoob](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40772348102) | `40772348102` | `failure` | As funções foram publicadas/confirmadas; a validação final falhou porque `sicoob-approval-reconciliation` continuou na versão 5, que já era a versão anterior. O log registra “No change found” nessa função. O gate exige incremento de versão mesmo quando não há mudança. |
| [Security Scan](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983158) | `40602983158` | `failure` | `npm audit (high+critical)` bloqueou por vulnerabilidades altas em `undici` e `zod`. |
| [Qualidade contínua](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982964) | `40602982964` | `failure` | O mesmo gate `npm audit` bloqueou por `undici` e `zod` (alta). |
| [CodeQL](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983073) | `40602983073` | `failure` | `init` carregou `v4.39.1`, mas `autobuild`/`analyze` rodaram `v4.38.2`; a análise terminou em erro de configuração e não produziu SARIF para upload. Correção proposta na [PR #164](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/164), aguardando CI. |

**Workflows verdes na última execução consultada:** Migration ledger drift (`40828393693`), Branch Protection Sentinel (`40602983038`), Enterprise Compliance & Audit Reporting (`40602982958`), Portal Sicoob (última execução disponível na `main`: `39868499315`) e atualizações Dependabot listadas no inventário. PRs não foram mescladas; portanto, esse estado é da `main` e deve ser reconsultado após as correções.

### Bloqueio de E2E autenticado — PR #163

Run [40911387860](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40911387860), commit `f3ef5d84c340badd3dfbe18d1a3e48483dd95192`, falhou no step **“Validar autorização remota e RLS técnico”**. O workflow confirmou que os secrets requeridos estão preenchidos (valores mascarados), mas as chamadas a `system-healthcheck`, `migration-health-check` e `auth-integrity-check` com token de teste expiraram em ~30,5 s; os hooks de `e2e_cleanup_rate_limit` também expiraram em 45 s durante `beforeAll`/`afterAll`. Resultado: 49 testes passaram, 3 falharam e 4 foram ignorados nesse gate. A evidência aponta timeout de serviços remotos, mas **não identifica por si só** se a causa é URL/project ref, chave, conta, quota, conectividade ou configuração do projeto.

**Ação do owner em andamento:** provisionar projeto Supabase de homologação e alinhar nele as contas de teste. Após concluir, atualizar os secrets já usados pelo workflow (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`, `SUPABASE_SERVICE_ROLE_KEY`, `E2E_USER_*`, `E2E_VIEWER_*`, `E2E_MANAGER_*`, `E2E_ADMIN_*`, `E2E_DEV_*` e `E2E_CLEANUP_TOKEN`) para o mesmo projeto; não enviar valores pela conversa. A variável `E2E_SUPABASE_PROJECT_ID` não é lida pelo workflow atual. Reexecutar o gate e só então distinguir falha de credenciais de falha de serviço/RLS.

### Correção CodeQL em validação

A [PR #164](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/164) alinha `init`, `autobuild` e `analyze` em `v4.39.1`. `actionlint`, `npm ci`, build, lint baseline, typecheck baseline e suíte Vitest passaram localmente; os checks remotos ainda estavam em execução/falha por outros gates no registro desta atualização. Não mesclar enquanto os checks requeridos não estiverem verdes.

## Atualização dos PRs e bloqueios — 2026-10-29

### Estado da `main`

O último SHA consultado continua sendo `e9d59026793b84fabeaeec9da890a068f64d49c3`; portanto, as quatro falhas abaixo ainda não foram corrigidas na `main`:

| Workflow | Última execução em `main` | Correção preparada | Estado |
|---|---:|---|---|
| Publicar funções Sicoob | [40772348102](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40772348102) | [PR #165](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/165): valida presença/versão válida e aceita versão inalterada se o CLI terminou sem erro | Aguardando checks; nenhum deploy executado |
| Security Scan | [40602983158](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983158) | [PR #164](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/164): atualiza `undici` e `zod` | `npm audit` local no PR #164: zero vulnerabilidades; PR não mesclada |
| Qualidade contínua | [40602982964](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982964) | Mesma correção de dependências da PR #164 | O check do PR #164 encontrou rate limit do ECR ao baixar PostgreSQL descartável; nova tentativa em execução |
| CodeQL | [40602983073](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983073) | [PR #165](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/165): ações alinhadas em `v4.39.1` | Aguardar check do PR antes de considerar resolvido na `main` |

### PR #164 — dependências e compatibilidade Zod

Head atual `84b0509cc0fc96f1eae90e2feff04e3b138e63a6`. Alterações locais completas: `undici@8.12.3`; `zod@4.6.7` com adaptação de `required_error`/`.errors`; ajuste do gate de publicação Sicoob. `npm audit --audit-level=high` reportou zero vulnerabilidades; build, lint baseline, typecheck baseline e suíte passaram (452 arquivos / 5.839 testes aprovados; 4 arquivos / 68 testes ignorados).

Checks remotos observados: audit, Gitleaks, CodeQL, Lighthouse, Bundle Size, Verba/Aprovação e origem confiável concluíram `success`; E2E concluiu `failure` e o check “Segurança, contratos e build” falhou no script de PostgreSQL. O run [40918030807](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40918030807) registrou `toomanyrequests: Data limit exceeded` ao baixar `public.ecr.aws/supabase/postgres:17.6.1.063`; a repetição do job está em andamento.

O review automatizado da Vercel falhou por billing/uso não habilitado ([run](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40918051737)); não é falha do código.

### PR #165 — somente workflows

Head `3837fbd413e0bdf751d1929f73c41151cb8dfa02`; altera exclusivamente os dois workflows de CodeQL e publicação Sicoob. Validações locais: `actionlint`, simulação do verificador, `npm ci`, build, lint baseline, typecheck baseline e suíte completa aprovados (452 arquivos / 5.839 testes aprovados; 4 arquivos / 68 testes ignorados).

No primeiro snapshot remoto, Gitleaks/origem confiável/aprovação transacional passaram. `npm audit` falhou porque essa branch parte da `main`, cujo lockfile ainda contém as duas vulnerabilidades altas que a PR #164 corrige. E2E e outros checks ainda estavam em execução. Não mesclar enquanto qualquer check requerido estiver falhando ou pendente.

### E2E e ação do owner

O E2E no SHA `84b0509cc` falhou antes dos testes Playwright, em **“Validar autorização remota e RLS técnico”**. O passo anterior confirmou apenas a presença dos secrets; três funções remotas e o cleanup atingiram timeout. Isso não prova qual credencial/projeto está errado.

O owner respondeu que vai provisionar o Supabase de homologação e alinhar URL, project ref, chave publicável, service role e usuários de teste no mesmo projeto. Status: **aguardando confirmação de configuração**. Não compartilhar valores de secrets na conversa. Reexecutar E2E somente após confirmação.

### Bloqueio de merge e banco

O README informa deploy automático do Lovable Cloud no push da branch principal. A PR #164 altera dependências e código de aplicação, então não será mesclada sob a regra ativa do objetivo; fica aberta e registrada até existir caminho autorizado sem deploy de produção, além de todos os checks verdes. A PR #165 é somente CI/configuração, mas atualmente encontra `npm audit` vermelho por depender do baseline vulnerável da `main`.

Nenhuma migration, Edge Function, tabela, dado ou configuração do Supabase foi alterada nesta etapa. Não executar publicação manual para “validar” o workflow.

### Atualização de checks após o snapshot anterior — 2026-10-29

- O rerun do job de PostgreSQL descartável no [run 40918030807](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40918030807) terminou novamente em `failure`: após três tentativas, `public.ecr.aws/supabase/postgres:17.6.1.063` respondeu `toomanyrequests: Data limit exceeded`. Causa externa reproduzida; não mudar os scripts nem enfraquecer o teste para contornar o rate limit.
- O E2E do [run 40919240512](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40919240512) no PR #165 terminou em `failure`, step “Validar autorização remota e RLS técnico”; os shards Playwright foram ignorados após o fail-fast. O owner ainda não confirmou que a homologação e os secrets foram atualizados; aguardar antes de nova execução.
- No PR #165, `npm audit` permanece `failure` porque a branch CI-only herda as duas vulnerabilidades altas do lockfile da `main`. As correções estão no PR #164, sem integração enquanto o workflow de construção/publish do Lovable não estiver autorizado e todos os bloqueios de validação permanecerem.
- O PR #164 segue aberto: audit, CodeQL e demais checks de aplicação concluídos como verdes, porém E2E e Qualidade contínua estão vermelhos pelos bloqueios acima. O review Vercel segue neutral/falha de billing, sem relação com o código.
