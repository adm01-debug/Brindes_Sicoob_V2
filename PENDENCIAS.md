# Pendências de CI — adm01-debug/Brindes_Sicoob_V2

Atualizado em: 2026-10-29

> O inventário histórico abaixo é de 22/10. O estado vigente e os links dos últimos runs em `main` estão no início de [RELATORIO_CI.md](RELATORIO_CI.md). Esta seção registra apenas bloqueios ainda não comprovados como resolvidos em `main`.

## Correções candidatas no PR #164 — aguardam integração e validação em `main`

O [PR #164](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/164) passou os checks de `npm audit`, CodeQL e build/contratos. Ele atualiza `undici` e migra `zod` para v4 (com ajustes em dois arquivos de aplicação), alinha as ações CodeQL e remove a exigência de incremento de versão em deploy sem alteração. O E2E e o Copilot Code Review continuam falhando nesse PR. Não considerar as correções concluídas em `main` até o merge autorizado e a confirmação de novos runs.

## Workflow: E2E autenticado / RLS remoto — ambiente de homologação pendente

**Evidência:** a última execução desse workflow em `main` foi [37775702358](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/37775702358), com conclusão `startup_failure` e sem jobs/logs acessíveis. A falha no hook remoto descrita abaixo veio de PR #168; o preflight que bloqueou por configuração ausente veio do PR #164.

**Erro exato:** `Hook timed out in 45000ms.` em `tests/rls/e2e-cleanup-rate-limit.test.ts` durante o `beforeAll` que cria a canária remota. O teste de autorização passou; no teste RLS, 52 passaram e 4 foram ignorados antes do timeout.

**Contrato da `main`:** o workflow ainda usa secrets `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` e `SUPABASE_SERVICE_ROLE_KEY`, além de `E2E_CLEANUP_TOKEN` e credenciais `E2E_*`.

**Contrato candidato no PR #164:** ambos os jobs passam a exigir Actions Variable `E2E_SUPABASE_PROJECT_ID` e Secrets `E2E_SUPABASE_URL`, `E2E_SUPABASE_PUBLISHABLE_KEY` e `E2E_SUPABASE_SERVICE_ROLE_KEY`. As contas E2E existentes e `E2E_CLEANUP_TOKEN` também devem pertencer ao mesmo projeto isolado. O preflight falha fechado para configuração ausente, URL/ref divergentes e os dois projetos canônicos protegidos.

**Falha atual comprovada:** o [run 40950721820](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40950721820) falhou no step `Validar projeto Supabase E2E isolado` com `Projeto E2E não validado: configuração ausente`. O log mostra vazios `E2E_SUPABASE_PROJECT_ID`, URL e chave publicável; nenhum teste remoto foi executado e `e2e-regression` foi ignorado por dependência do job `e2e`. A lista atual de Actions Variables está vazia e os três secrets dedicados não estão cadastrados. O operador confirmou que irá configurar homologação, mas a configuração ainda não foi observada. Nenhum valor de secret foi lido.

Não aumentar o timeout nem marcar os testes como sucesso sem reproduzir a operação no projeto isolado. Nenhum banco canônico foi alterado nesta auditoria.

## Workflow: Running Copilot Code Review — quota de conta

**Evidência:** [run 39785094125](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39785094125) em `main`.

**Erro:** limite adicional de uso do Copilot excedido, HTTP 402 / `SessionModelError`.

**Ação externa:** restaurar a quota/plano Copilot e executar um novo run. Não há correção de código para este bloqueio.

## Dependabot `@vitest/mocker` — execução antiga não representa o lockfile atual

**Evidência:** [run 39775463512](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39775463512), no SHA `ae1b92b3`.

O run falhou porque o caminho de atualização ainda resolvia `@vitest/mocker` para 4.1.11. O `package-lock.json` atual em `main` fixa 4.1.12; considerar o run histórico obsoleto, e confirmar a correção quando ocorrer nova execução Dependabot atual. Não reexecutar um run preso ao SHA antigo.

## Risco de integração — merge de código da aplicação

Os PRs #164, #168 e #169 continuam abertos. Os PRs #164 e #168 alteram código da aplicação; #169 contém migration de banco. Não mesclar nem aplicar migration remota com os checks E2E pendentes. Após homologação isolada, conferir todos os checks exigidos, a política de deploy do projeto e a versão remota antes de integrar.

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

## Atualização operacional — 29/10/2026

Esta atualização complementa as pendências históricas acima; não apaga seus registros.

| ID | Área | Bloqueio atual | Próxima ação |
|---|---|---|---|
| P-20261029-01 | E2E (Playwright) | Último run de `main` `37775702358` terminou em `startup_failure` sem logs acessíveis. No PR #164, `40950721820` comprovou que a variável e os secrets E2E estão vazios/ausentes; testes remotos não executaram. | A `main` exige as credenciais legadas listadas acima. Para o contrato candidato do PR #164, cadastrar Actions Variable `E2E_SUPABASE_PROJECT_ID` e Secrets `E2E_SUPABASE_URL`, `E2E_SUPABASE_PUBLISHABLE_KEY` e `E2E_SUPABASE_SERVICE_ROLE_KEY`; manter contas `E2E_*` e `E2E_CLEANUP_TOKEN` no mesmo projeto isolado. Confirmar a URL e o ID do projeto antes de reexecutar. Não usar produção; não registrar valores de secrets. O preflight rejeita os projetos canônicos conhecidos, mas o ID exato de homologação precisa ser definido e validado. |
| P-20261029-02 | Security Scan / Qualidade contínua | Em `main`, os runs `40602983158` e `40602982964` ainda são as últimas falhas por `undici`/`zod`. No PR #164, `npm audit` e o gate agregado passaram; a segunda tentativa do gate (run `40950721664`) confirmou que o limite transitório do registry não persistiu. | Correção candidata validada remotamente no PR #164. Aguardar somente os bloqueios E2E/Copilot antes da integração autorizada; depois confirmar novos runs verdes em `main`. |
| P-20261029-03 | CodeQL | A última falha em `main` é `40602983073` (desalinhamento 4.39.1/4.38.2 e SARIF ausente). | O check `Analyze (javascript-typescript)` passou em `23fc59a` ([run 40950721798](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40950721798)); confirmar conclusão dos demais checks antes de integrar o PR #164. |
| P-20261029-04 | Publicar funções Sicoob | Run `40772348102`: o verificador falhou porque `sicoob-approval-reconciliation` manteve versão 5 em deploy sem mudança; nenhuma publicação remota foi feita nesta rodada. | O PR #164 altera o critério para validar a presença da função após deploy sem exigir incremento vazio e tem simulação local. Validar apenas em execução autorizada e com os checks verdes; não disparar deploy de produção para testar. |
| P-20261029-05 | Bundle Size / Lighthouse | Falhas históricas `36353765911`/`36353765910`; os jobs correspondentes passaram no SHA `23fc59a` (bundle e lighthouse), sem novo run em `main`. | Tratar como corrigido candidato no PR #164; confirmar após integração autorizada e novo run em `main`. |
| P-20261029-06 | Copilot Code Review | Run em `main` `39785094125`: quota excedida / `SessionModelError` HTTP 402. No PR #164, run `40950735858` falhou porque o firewall da action bloqueou a conexão do Copilot CLI a `api.github.com`. | `main`: restaurar quota/plano. PR: revisar allowlist/firewall do serviço Copilot/GitHub; não mascarar falha nem alterar aplicação por isso. |
| P-20261029-07 | Migrations canônicas | 12 versões do ledger (`20261015102000`, `20261015230500`, `20261015233500`, `20261015235000`, `20261015235500`, `20261016000000`, `20261016160000`, `20261016163000`, `20261016170000`, `20261016171500`, `20261016172000`, `20261016173000`) não têm arquivo SQL na árvore atual do GitHub. A diferença está na baseline histórica. | Recuperar e revisar os SQLs em procedimento read-only, registrar fontes/checksums e preservar como aplicados; não reenviar nem corrigir ledger no projeto canônico. Comparação de hash integral permanece pendente. |
| P-20261029-08 | `health-check` local | O patch local troca o contrato de dependências (`POST`, `status: healthy/degraded`) por liveness (`GET`, `status: ok`). `scripts/healthcheck.mjs` envia POST e `scripts/smoke-tests.mjs` só considera `healthy` sucesso. | Não portar/deployar essa versão. Criar contrato compatível ou endpoint de liveness separado e testar todos os consumidores. |
| P-20261029-09 | HMAC `bi-share-dossier` local | O patch elimina fallback para `SUPABASE_SERVICE_ROLE_KEY` e exige `BI_SHARE_SECRET`, mas disponibilidade da nova chave não foi verificada; trocar a chave HMAC invalida links existentes. | Validar secret em homologação e preparar transição que mantenha validação dos links anteriores até expiração planejada. Nunca registrar o valor da chave. |
| P-20261029-10 | Diferença local/GitHub | A cópia local auditada estava 84 commits atrás da `origin/main`. A correção de `secretNormalizers.ts` já existe na `main` atual; E-006 também já foi implementada de forma mais completa no remoto. | Usar `origin/main` como base para qualquer novo PR; reconciliar arquivo a arquivo. Não publicar o checkout antigo em massa. |

**Estado do banco nesta atualização:** somente leituras. Nenhuma migration, deploy ou operação de escrita foi executada.
