# PendÃªncias de CI â€” adm01-debug/Brindes_Sicoob_V2

Atualizado em: 2026-10-22

Cada seÃ§Ã£o abaixo descreve um workflow que falha por motivo externo ao cÃ³digo do repositÃ³rio.
O erro exato foi extraÃ­do do run mais recente disponÃ­vel em main.

---

~~## Workflow: `npm_and_yarn` â€” Dependabot `@vitest/mocker` Update~~

> âœ… **RESOLVIDO em 2026-10-22** â€” `vitest` e todos `@vitest/*` atualizados para 4.1.12 no commit `b32e5e4`. CVEs GHSA-qxg6-89mg-rqv8 e GHSA-xp26-3454-mjgp corrigidas.

---

## Workflow: Enterprise Compliance & Audit Reporting

**Run atual:** `39780447872` Â· Job `119830039718`  
**Step:** "Database RLS Scan"  
**Erro exato:**

```
check_tables_rls falhou: Service for this project is restricted due to the following violations:
exceed_edge_functions_invocations_quota, exceed_egress_quota.
The project owner must upgrade their plan or remove spend caps to restore service.
```

**Causa raiz:** Quota de edge functions e egress do projeto Supabase esgotada â€” o workflow
chama funÃ§Ãµes via Management API e o projeto rejeita por billing.

**O que vocÃª precisa fazer:**

1. Acesse o painel do Supabase do projeto em uso pelos testes.
2. Verifique se hÃ¡ spend caps ativos e remova-os, ou adicione crÃ©ditos ao plano.
3. ApÃ³s restaurar a quota, o workflow deve passar sem nenhuma mudanÃ§a de cÃ³digo.

---

## Workflow: `e2e` â€” Smoke gate Playwright bloqueado por quota Supabase

**SituaÃ§Ã£o:** Duas partes distintas neste workflow:

### Parte 1 â€” Testes vitest (authz + RLS) âœ… Resolvido

> âœ… **RESOLVIDO em 2026-10-22** â€” `edge-authz-bypass.test.ts` atualizado para aceitar HTTP 402
> (quota Supabase). `e2e-cleanup-rate-limit.test.ts` atualizado para tratar quota com
> `isQuotaExhaustedError` + flag `quotaExhausted`. Fix aplicado no PR #141.

### Parte 2 â€” Smoke gate Playwright âš ï¸ Externo

**Causa raiz:** A quota Supabase esgotada (`exceed_edge_functions_invocations_quota`,
`exceed_egress_quota`) faz com que o endpoint de autenticaÃ§Ã£o retorne HTTP 402. A fixture
global do Playwright (`tests/e2e/fixtures/auth.ts`) nÃ£o consegue criar sessÃ£o â†’ todos os
39 testes sÃ£o pulados em 0ms â†’ o job detecta 0 testes passando e falha com:

```
ðŸ›‘ Fail-fast se smoke falhou (gate)
::error title=Smoke gate failed::...
Process completed with exit code 1.
```

**Este nÃ£o Ã© um bug no cÃ³digo** â€” Ã© a mesma causa raiz do workflow Enterprise Compliance.
A falha Ã© inevitÃ¡vel enquanto a quota Supabase nÃ£o for restaurada.

**O que vocÃª precisa fazer:**

1. Restaure a quota Supabase (mesma aÃ§Ã£o da seÃ§Ã£o Enterprise Compliance acima).
2. ApÃ³s restaurar, o smoke gate passa automaticamente sem nenhuma mudanÃ§a de cÃ³digo.

---

## Workflow: `copilot-pull-request-reviewer`

**Run mais recente observado:** [40795427376](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40795427376) Â· PR #152
**Erro exato:**

```
SessionModelError: You've reached your additional usage limit for your plan.
Go to https://github.com/settings/copilot/features for more details.
(Request ID: 902B:218FBF:B4B372B:BEBD93B:6AE295C1)
errorCode: 'quota', statusCode: 402
```

**Causa raiz:** Quota mensal do GitHub Copilot esgotada.

**O que vocÃª precisa fazer:**

1. Acesse `github.com/settings/billing` e verifique o uso do Copilot.
2. Atualize o plano ou aguarde o reset do ciclo de faturamento.

---

## Workflow: `lighthouse` (Lighthouse Performance Audit)

**Trigger:** `on: pull_request` com `paths-ignore: ['docs/**', '*.md', '.github/CODEOWNERS']` â€” **nÃ£o dispara em push Ã  main**.  
**Run mais recente disponÃ­vel:** `36353765910` Â· Job `108717316857` Â· SHA `99dd8778` Â· 2026-09-27  
**Log:** expirado (HTTP 404 â€” run de 25 dias; steps retornados vazios pela API).  
**Estado em PR #136:** SKIPPED corretamente (mudanÃ§as apenas em `*.md`).

**Causa provÃ¡vel da falha de Set/27:** O workflow executa `npx @lhci/cli@0.13.0 autorun` e usa o secret `LHCI_GITHUB_APP_TOKEN` para integraÃ§Ã£o com GitHub Checks. Sem o token configurado (ou com token expirado), o LHCI retorna erro de autenticaÃ§Ã£o mas ainda gera relatÃ³rio; a falha pode ser de orÃ§amento de performance ou de token. Logs indisponÃ­veis para confirmar.

**Impacto:** Zero em push Ã  main â€” workflow sÃ³ corre em PRs. Em PRs com mudanÃ§as de cÃ³digo, pode falhar por:
1. `LHCI_GITHUB_APP_TOKEN` ausente/expirado no repositÃ³rio.
2. OrÃ§amento de performance configurado em `.lighthouserc.*` nÃ£o sendo atingido.

**O que vocÃª precisa fazer:**
1. Verifique se o secret `LHCI_GITHUB_APP_TOKEN` estÃ¡ configurado em Settings â†’ Secrets and variables â†’ Actions.
2. Na prÃ³xima abertura de PR com mudanÃ§as de cÃ³digo, observe o log do job `lighthouse` para confirmar a causa raiz.
3. Sem aÃ§Ã£o imediata necessÃ¡ria â€” nÃ£o bloqueia push Ã  main.

---

## Workflow: `bundle-stats` (Bundle Size Check)

**Trigger:** `on: pull_request` â€” **nÃ£o dispara em push Ã  main**.  
**Run mais recente disponÃ­vel em main:** `36353765911` Â· Job `108717316864` Â· SHA `99dd8778` Â· 2026-09-27  
**Log:** expirado (HTTP 404).  
**Estado em PR #136:** **success** âœ… Â· Run `39787553405` Â· Job `119854596437`.

**Causa da falha de Set/27:** Logs indisponÃ­veis. PossÃ­vel causa: script `scripts/qa/check-bundle-budget.mjs` com limite de orÃ§amento ultrapassado no cÃ³digo daquele PR.  
**Estado atual:** NÃ£o Ã© um bloqueio â€” no cÃ³digo atual (PR #136) o check PASSOU.

---

## Workflow: `Aplicar migrations Sicoob` (`apply-sicoob-migrations.yml`)

**Trigger:** `workflow_dispatch` apenas (manual) â€” requer input `confirmar: "APLICAR"` e branch `main`.  
**NÃ£o hÃ¡ runs automÃ¡ticos.** Workflow sÃ³ executa quando o owner aciona manualmente via GitHub UI ou API.  
**Ãšltimo run:** nÃ£o disponÃ­vel (nenhum run automÃ¡tico indexado em `branch=main`).  
**AÃ§Ã£o necessÃ¡ria:** Nenhuma no momento â€” workflow Ã© utilitÃ¡rio para aplicar migrations ao banco de construÃ§Ã£o sob demanda.

---

## Workflow: `Monthly DB Audit` (`db-performance-audit.yml`)

**Trigger:** Cron `0 0 1 * *` (dia 1 de cada mÃªs Ã s 00:00 UTC) + `workflow_dispatch`.  
**PrÃ³xima execuÃ§Ã£o automÃ¡tica:** 2026-11-01 00:00 UTC.  
**Estado:** NÃ£o avaliÃ¡vel atÃ© 2026-11-01. O workflow requer secrets `VITE_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` â€” se ausentes, o job falha com `::error::Secrets ausentes`.  
**O que verificar em Nov/01:**
1. Se o run falhar por secrets ausentes: configure `VITE_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` em Settings â†’ Secrets and variables â†’ Actions.
2. Se falhar por Supabase quota: mesma aÃ§Ã£o da seÃ§Ã£o Enterprise Compliance.

---

## Workflow: `SeguranÃ§a, contratos e build` (`ci.yml`) â€” ECR Rate Limit

**Commits afetados:** `5b34841` e `7211e12` (branch `claude/hopeful-mccarthy-8rqrqw`)
**Runs:** `39850827027` Â· `39852468612`
**Step:** "Simular controles de auditoria" / "Simular ACL efetiva"
**Erro exato:**

```
RuntimeError: docker run falhou apÃ³s 3 tentativas:
Unable to find image 'public.ecr.aws/supabase/postgres:17.6.1.063' locally
docker: Error response from daemon: toomanyrequests: Data limit exceeded
```

**Causa raiz:** Rate limit do ECR Public da AWS ao puxar a imagem Docker `public.ecr.aws/supabase/postgres:17.6.1.063` nos scripts `simular-controles-auditoria.py` e `simular-acl-efetiva.py`. NÃ£o Ã© um bug no cÃ³digo do PR â€” Ã© throttling de infraestrutura externa. Em execuÃ§Ãµes posteriores (ex: run `39780447863`) o rate limit se dissipar naturalmente e o workflow retornou **success**.

**O que vocÃª precisa fazer:** Nenhuma aÃ§Ã£o imediata. Se a falha persistir em execuÃ§Ãµes futuras:
1. Habilitar o Amazon ECR pull-through cache ou autenticar no ECR antes do pull.
2. Alternativa: migrar os scripts para usar a imagem via GHCR ou Docker Hub se disponÃ­vel.

---

## Gaps de banco de dados identificados em auditoria (2026-10-22)

### Gap 1 â€” CRÃTICO: Migration `20261022120000` ausente de `supabase_migrations.schema_migrations`

**Status:** âœ… RESOLVIDO â€” migration de reparo aplicada no commit `48ee07f`.

A migration `20261022120000_add_public_favorites_to_security_definer_allowlist.sql` foi aplicada ao banco fora do Supabase CLI (via Management API), portanto nunca foi registrada em `supabase_migrations.schema_migrations`. O schema estava correto, mas o ledger do Supabase ficou dessincronizado. InserÃ§Ã£o de reparo realizada no commit acima.

### Gap 2 â€” MÃ‰DIO: `e2e_cleanup_check_rate_limit` com `search_path` incompleto

**Status:** âœ… RESOLVIDO â€” migration de reparo aplicada no mesmo commit.

A funÃ§Ã£o SECURITY DEFINER `e2e_cleanup_check_rate_limit` tinha `SET search_path TO 'public'` sem o `pg_catalog` explicitamente como primeiro elemento, diferentemente das outras funÃ§Ãµes SECURITY DEFINER do projeto (`get_public_favorite_list` e `get_public_favorite_reactions`). Corrigido para `pg_catalog, public` por consistÃªncia com o padrÃ£o de hardening do projeto.

### Gap 3 â€” MÃ‰DIO: `relforcerowsecurity = false` em `e2e_cleanup_rate_limit`

**Status:** âš ï¸ NÃ£o corrigido â€” avaliaÃ§Ã£o: risco aceitÃ¡vel pelo design atual.

A tabela `e2e_cleanup_rate_limit` tem `FORCE ROW LEVEL SECURITY` desabilitado, o que permite Ã  role `postgres` (dono) acessar diretamente sem passar pelo RLS. Em produÃ§Ã£o isso Ã© aceitÃ¡vel: a Ãºnica escrita legÃ­tima Ã© via RPC SECURITY DEFINER `e2e_cleanup_check_rate_limit` que roda como `postgres` por design. Adicionar `FORCE ROW LEVEL SECURITY` quebraria a RPC.

---

## InventÃ¡rio completo de falhas â€” main (status=failure, consultado em 2026-10-22 19:30 UTC)

Lista lida via API (`branch=main`, 50 runs, Ãºltimo run de cada workflow).

| Workflow | Run mais recente | ConclusÃ£o | Causa | Status |
|---|---|---|---|---|
| Security Scan | `39835755469` (SHA `82262c4`) | failure | dompurify CVE (CRITICAL) | âœ… Resolvido por PR #141 (pending merge) |
| Qualidade contÃ­nua | `39835755495` (SHA `82262c4`) | failure | dompurify CVE (CRITICAL) | âœ… Resolvido por PR #141 (pending merge) |
| Enterprise Compliance & Audit Reporting | `39835755339` (SHA `82262c4`) | failure | Supabase quota esgotada | âš ï¸ Externo â€” ver seÃ§Ã£o acima |
| Running Copilot Code Review | `39785094125` (SHA `4f5de103`) | failure | Quota GitHub Copilot 402 | âš ï¸ Externo â€” ver seÃ§Ã£o acima |
| npm_and_yarn @vitest/mocker | `39775463512` (SHA `ae1b92b3`) | failure | `security_update_not_possible` Dependabot | âœ… Resolvido por PR #139 |

**Workflows verdes (Ãºltima execuÃ§Ã£o = success):**
Branch Protection Sentinel, CodeQL, Migration Ledger Drift, Portal Sicoob, Dependabot updates gerais.

---

~~## Gap de SeguranÃ§a: AusÃªncia de `npm audit` no CI~~

> âœ… **RESOLVIDO em 2026-10-22** â€” Job `npm-audit` adicionado ao `security.yml` no commit `b32e5e4`. Roda em PRs, push para main e schedule semanal com `--audit-level=high`.

---

## Workflows corrigidos (resolvidos em PRs anteriores)

| Workflow | Causa | CorreÃ§Ã£o | PR |
|---|---|---|---|
| Branch Protection Sentinel | Squash merge com mensagem customizada sem `(#NNN)` | PR mergeado sem `commit_message` custom (GitHub gera tÃ­tulo com `(#NNN)`) | #128 |
| Enterprise Compliance â€” Security Definer ACL | `audit_security_definer_acl()` sem `get_public_favorite_list` e `get_public_favorite_reactions` | Migration `20261022120000_add_public_favorites_to_security_definer_allowlist.sql` | #126 |
| Migration Ledger Drift | Fingerprint de `20261022120000` calculado com `local_sha256` incorreto; novo digest correto: `e2815b0...` | Corrigido fingerprint no `migration-ledger-baseline.json` | #129 |
| 5 CVEs high (vite â‰¤6.4.3) | GHSA-698v, GHSA-r825, GHSA-587h, GHSA-9jrq, GHSA-rq7h | `vite` 6.4.3 â†’ 6.4.5 | #126 |
| Qualidade contÃ­nua (`ci.yml`) â€” ECR rate limit | `toomanyrequests: Data limit exceeded` ao puxar `public.ecr.aws/supabase/postgres:17.6.1.063` em dois steps (scripts `simular-controles-auditoria.py` e `simular-acl-efetiva.py`) | Rate limit do ECR Public se dissipou naturalmente; run `39780447863` â†’ **success** | automÃ¡tico |


# PendÃªncias atualizadas â€” 2026-10-31

Esta seÃ§Ã£o substitui snapshots anteriores para o estado atual dos workflows e do E2E. NÃ£o registrar valores de segredo neste arquivo.

## Bloqueio externo: ambiente isolado para E2E autenticado

O repositÃ³rio remoto ainda nÃ£o fornece evidÃªncia verificÃ¡vel de que os secrets de environment `e2e-qa` existem: o conector lista apenas secrets no escopo do repositÃ³rio e nÃ£o revela os valores/nomes definidos em environments. Os nomes `E2E_SUPABASE_URL`, `E2E_SUPABASE_PROJECT_ID`, `E2E_SUPABASE_PUBLISHABLE_KEY` e `E2E_SUPABASE_SERVICE_ROLE_KEY` nÃ£o foram encontrados no escopo do repositÃ³rio; isso **nÃ£o prova** que estejam ausentes do environment.

Para liberar os testes remotos com seguranÃ§a, concluir no GitHub:

1. Criar/confirmar um projeto Supabase exclusivo e descartÃ¡vel para QA; nunca usar o projeto do portal `cfmzkthhgliqelozlmwu` nem o catÃ¡logo `doufsxqlfjyuvxuezpln`.
2. Criar o environment `e2e-qa` com revisores obrigatÃ³rios.
3. Configurar nele os quatro secrets `E2E_SUPABASE_*`, `E2E_CLEANUP_TOKEN` e credenciais/TOTP das personas de teste.
4. Configurar as variÃ¡veis `E2E_ALLOWED_PROJECT_ID` e `E2E_CLEANUP_DRY_RUN=0`. O workflow falha antes dos testes se o projeto nÃ£o estiver na allowlist ou se o cleanup de QA nÃ£o estiver explicitamente habilitado.
5. Configurar a Edge Function `e2e-cleanup` nesse projeto com token e lista de emails exclusivos de QA.
6. ApÃ³s a configuraÃ§Ã£o, executar `E2E (Playwright)` e `Enterprise Compliance & Audit Reporting` por `workflow_dispatch` na `main`; confirmar todos os jobs verdes e que as fixtures foram removidas.

**Bloqueio:** enquanto esses passos nÃ£o forem concluÃ­dos, a jornada autenticada completa e o teste RLS remoto permanecem sem prova de execuÃ§Ã£o. O E2E pÃºblico, sem secrets, pode continuar rodando em PRs.

## Bloqueio de dependÃªncias â€” npm audit

Os runs [Security Scan #41177996979](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41177996979) e [Qualidade contÃ­nua #41177997004](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41177997004) falharam pelo mesmo gate: `npm audit` reportou `undici` (high) e `zod` (high). `undici` tem correÃ§Ã£o sem major; `zod@3.25.76` sÃ³ tem correÃ§Ã£o indicada em major 4 (>=4.6.6). Fazer uma branch de correÃ§Ã£o separada, atualizar `undici` sem major e avaliar Zod 4 com migraÃ§Ã£o, typecheck, build e suÃ­te completa. NÃ£o desativar nem enfraquecer o gate.

## E2E remoto no PR #183

O [run 41177997096](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41177997096) recebeu secrets genÃ©ricos em PR e falhou quando o `beforeAll` do teste RLS passou de 45 s. A causa operacional exata nÃ£o Ã© demonstrÃ¡vel porque o valor do projeto estÃ¡ mascarado e nÃ£o hÃ¡ acesso aos secrets de environment. A correÃ§Ã£o proposta move a jornada autenticada para `workflow_dispatch` na main + `e2e-qa`, torna o PR estritamente pÃºblico/sem secrets e faz o destino ser validado no workflow e nos testes remotos. O status remoto dessa correÃ§Ã£o sÃ³ poderÃ¡ ser provado apÃ³s publicar a branch e aguardar o CI.

## ValidaÃ§Ã£o pendente: proteÃ§Ã£o dos dispatches com credenciais Supabase

RevisÃ£o transversal encontrou jobs que recebiam credenciais privilegiadas durante `workflow_dispatch` em branches arbitrÃ¡rias: compliance, auditoria de performance e migration-ledger drift. Os trÃªs agora restringem o disparo manual Ã  `main`; os workflows de aplicaÃ§Ã£o de migrations e deploy de Edge Functions jÃ¡ tinham essa proteÃ§Ã£o. `actionlint` e os gates locais serÃ£o repetidos; sÃ³ o CI de PR poderÃ¡ validar a mudanÃ§a de forma remota. Em `migration-ledger-drift.yml`, confirmar tambÃ©m que o environment `construction` mantÃ©m polÃ­tica de branches restrita Ã  `main`.

O workflow Lighthouse tambÃ©m recebeu correÃ§Ã£o: o token da GitHub App foi removido porque o destino do upload Ã© `filesystem`, e `continue-on-error` foi eliminado. O CI deve confirmar que o upload de artefatos e as asserÃ§Ãµes seguem verdes.

Foram removidos ainda os `continue-on-error` restantes em `sicoob-ci.yml` e `bundle-check.yml`. O CI precisa confirmar publicaÃ§Ã£o de artefatos sem supressÃ£o de falhas.

O CodeQL tambÃ©m foi corrigido localmente ao alinhar `init`, `autobuild` e `analyze` no release 4.39.1. O run da `main` falhou antes de gerar SARIF por incompatibilidade 4.39.1/4.38.2; confirmar geraÃ§Ã£o e validaÃ§Ã£o de SARIF no PR.

## Falhas atuais da Ãºltima execuÃ§Ã£o da `main` â€” inventÃ¡rio 2026-10-31

* **Migration ledger drift â€” [run 41175713780](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41175713780):** step 6 terminou com exit 2 e `[ledger] VerificaÃ§Ã£o indisponÃ­vel (Error); nenhum resultado aprovado.`. O step 7 (auditoria RLS) completou sem findings. A causa exata nÃ£o era confirmÃ¡vel porque o script ocultava `error.message`; agora a mensagem Ã© exibida com Bearer/access/service/API keys redigidas, e o cenÃ¡rio unitÃ¡rio verifica essa redaÃ§Ã£o. NÃ£o apliquei migrations nem executei SQL remoto. PrÃ³ximo passo: validar diagnÃ³stico numa execuÃ§Ã£o posterior autorizada na main.
* **Publicar funÃ§Ãµes Sicoob â€” [run 40772348102](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40772348102):** o CLI respondeu `No change found` para `sicoob-approval-reconciliation` (versÃ£o permaneceu 5), mas a confirmaÃ§Ã£o exigia aumento de versÃ£o e marcou falso negativo. A PR #186 altera o verificador para aceitar versÃ£o igual, exigir funÃ§Ã£o existente, versÃ£o inteira positiva e nÃ£o regressiva; 4 testes unitÃ¡rios e simulaÃ§Ã£o local passaram. NÃ£o reexecutei o deploy. CI da PR ainda estÃ¡ bloqueado por audit high da main e CodeQL antigo; sem deploy remoto.
* **Security Scan â€” [run 40602983158](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983158) e Qualidade contÃ­nua â€” [run 40602982964](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982964):** ambos bloqueados pelo audit high em `undici` e `zod`. AtualizaÃ§Ã£o segura do Undici e migraÃ§Ã£o de compatibilidade Zod 4 permanecem em branch separada, com suÃ­te completa exigida; nÃ£o atualizar por `--force`.
* **CodeQL â€” [run 40602983073](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983073):** causa era mix de versÃµes (init 4.39.1 vs autobuild/analyze 4.38.2); correÃ§Ã£o local preparada e aguarda CI.
* Workflows verdes vistos no inventÃ¡rio: Branch Protection Sentinel [40602983038](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983038), Enterprise Compliance [40602982958](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982958) e Portal Sicoob [39868499315](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39868499315).

## ValidaÃ§Ã£o local pÃ³s-commit

ApÃ³s o quarto commit: build, lint (0 erros; 873 avisos existentes), lint baseline, typecheck, typecheck baseline e suÃ­te completa passaram. Resultado: 454 arquivos de teste aprovados, 4 condicionais pulados; 5.855 testes aprovados, 68 condicionais pulados. A primeira execuÃ§Ã£o pÃ³s-commit apresentou exceÃ§Ã£o assÃ­ncrona jsdom/Radix em `admin-ref-warning-guard`; a repetiÃ§Ã£o integral passou sem alterar nem enfraquecer o teste. `npm audit` continua bloqueado pelos 2 findings high jÃ¡ descritos.

## AtualizaÃ§Ã£o de auditoria dos PRs â€” 2026-10-31

### PR #185: E2E remoto nÃ£o pode ser repetido atÃ© comprovaÃ§Ã£o do destino

O run [41183325196](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41183325196) falhou no `beforeAll` de `tests/rls/e2e-cleanup-rate-limit.test.ts`, com timeout de 45 s ao inserir uma linha-canÃ¡rio em `public.e2e_cleanup_rate_limit`. O teste usa `SUPABASE_SERVICE_ROLE_KEY`, tenta apagar a canary no `afterAll` e tambÃ©m executa operaÃ§Ãµes anon de insert/update/delete.

Na versÃ£o do workflow da `main` usada por esse PR, as secrets genÃ©ricas `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID` e `SUPABASE_SERVICE_ROLE_KEY` sÃ£o entregues ao job de PR sem `environment: e2e-qa` ou allowlist. NÃ£o Ã© possÃ­vel comprovar pelo GitHub qual projeto essas secrets apontaram nem se a requisiÃ§Ã£o de insert foi efetivada antes do timeout. NÃ£o afirmo que o banco ficou intacto. A conexÃ£o MCP de leitura ao Supabase canÃ´nico expirou duas vezes; nenhum SQL foi executado por esta auditoria.

**AÃ§Ã£o do owner:** identificar em privado o destino configurado nas secrets utilizadas no run; se era o projeto QA autorizado, inspecionar nele a canary criada no horÃ¡rio do run e removÃª-la apenas se confirmada como fixture Ã³rfÃ£. Se o destino era um projeto canÃ´nico, avaliar o impacto e a rotaÃ§Ã£o das secrets de acordo com a polÃ­tica da organizaÃ§Ã£o. NÃ£o publicar valores de secrets. **NÃ£o rerodar E2E remoto** atÃ© que a proteÃ§Ã£o da PR #184 esteja na Ã¡rvore do workflow e o destino QA seja comprovado.

A PR #184 introduz a proteÃ§Ã£o: PRs usam placeholders sem secrets e executam apenas jornadas pÃºblicas; testes remotos autenticados ficam em `workflow_dispatch` com environment `e2e-qa`, allowlist de projeto e bloqueio dos projetos canÃ´nicos. O E2E duplicado da PR #186 [41184349669](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41184349669) foi cancelado para evitar nova tentativa de escrita com destino nÃ£o comprovado.

### Outros checks remotos ainda bloqueados

- A simulaÃ§Ã£o PostgreSQL da PR #185 falhou inicialmente no run [41183325186](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41183325186) porque o ECR respondeu `toomanyrequests: Data limit exceeded` ao baixar `public.ecr.aws/supabase/postgres:17.6.1.063`. Rerun apenas dos jobs falhos terminou **success** na tentativa 2. O container usa `--network none`; nÃ£o Ã© uma chamada Supabase.
- Na PR #185, `npm audit` e CodeQL passaram; E2E falhou pelo timeout acima. Copilot continua bloqueado por HTTP 402/quota ([run 41183332482](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41183332482)).
- Na PR #186, `npm audit` ainda encontra `undici` e `zod` high porque a branch parte da `main` sem a correÃ§Ã£o da PR #185 ([run 41184349697](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41184349697)). CodeQL tambÃ©m herdou o desalinhamento 4.39.1/4.38.2 ([run 41184349695](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41184349695)); o fix estÃ¡ nas PRs #184/#185, nÃ£o nesta branch. Copilot falhou por quota ([run 41184357641](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41184357641)).
- NÃ£o mesclar PRs com checks falhos/pendentes. NÃ£o houve escrita manual ao banco canÃ´nico; permanece sem comprovaÃ§Ã£o se o workflow remoto da PR #185 teve efeito parcial, conforme descrito acima.

### Checks dinÃ¢micos fora do inventÃ¡rio de workflows de produto

- O run Copilot dinÃ¢mico na branch de referÃªncia `main` [39785094125](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39785094125) falhou por quota HTTP 402; a execuÃ§Ã£o atual na PR #185 tambÃ©m falhou pela mesma quota ([41183332482](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41183332482)). AÃ§Ã£o do owner: liberar/aguardar cota do Copilot.
- O run dinÃ¢mico de Dependabot para `@vitest/mocker` [39775463512](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39775463512) falhou com `security_update_not_possible`; os updates posteriores de `undici` e Zod reportados na main foram `success` ([40603001428](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40603001428), [40603001197](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40603001197)). Sem PR aberta reproduzÃ­vel para esse run antigo, manter como histÃ³rico, nÃ£o como bloqueio atual dos cinco workflows de produto listados.

## SituaÃ§Ã£o atual apÃ³s correÃ§Ãµes locais â€” 2026-10-31

- Os commits de correÃ§Ã£o de `undici` e Zod 4 (`a96fd44ca`, `46e6cc33c`) foram cherry-picked para a branch da PR #184. `npm audit` local terminou sem vulnerabilidades; build, typecheck e suÃ­te completa passaram. A correÃ§Ã£o ainda **nÃ£o estÃ¡ na main** e os checks remotos do novo SHA ainda precisam concluir.
- A consulta de environments do GitHub confirmou que `e2e-qa` ainda nÃ£o existe (404). Existe `e2e-staging`, mas sem regras de proteÃ§Ã£o ou polÃ­tica de branches. Ele nÃ£o atende ao isolamento exigido e nÃ£o serÃ¡ usado como destino remoto. O owner informou que vai configurar o projeto QA; atÃ© isso ser confirmado, testes E2E autenticados permanecem bloqueados.
- Nenhum valor de secret foi lido ou registrado. NÃ£o houve chamada de escrita ao Supabase nem execuÃ§Ã£o de migration/deploy.
- Os commits estÃ£o publicados na PR #184. Os cinco workflows ainda constam como falha na Ãºltima execuÃ§Ã£o da `main` do inventÃ¡rio de 2026-10-31; sÃ³ novas execuÃ§Ãµes na `main` poderÃ£o confirmar a resoluÃ§Ã£o.

> **CorreÃ§Ã£o de status:** a cota do ECR foi recuperada; a execuÃ§Ã£o posterior no SHA `640944d97` passou, conforme abaixo. O bloqueio atual Ã© de revisÃ£o/merge, nÃ£o de ECR.

### Falha intermitente de infraestrutura na PR #184 â€” ECR

O run [41188633657](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41188633657), no SHA `c1c0a6e30fb1be755aee9b30fec5835600514cc7`, falhou apenas em **â€œSimular controles de auditoria e permissÃµes em PostgreSQL descartÃ¡velâ€**. O pull de `public.ecr.aws/supabase/postgres:17.6.1.063` respondeu `toomanyrequests: Data limit exceeded` apÃ³s trÃªs retentativas internas. O rerun somente do job (tentativa 2) repetiu a causa. Posteriormente, o SHA `640944d97f8ee3da1c66fa40247b1397d2809474` executou novamente o workflow [41190013312](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41190013312) e todas as simulaÃ§Ãµes, inclusive a mesma etapa PostgreSQL, terminaram **success**. O limite do ECR foi transitÃ³rio e nÃ£o Ã© bloqueio atual da PR.

O problema voltou no SHA `f4014641d`: [run 41191870511](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41191870511) falhou na mesma etapa e o rerun isolado (tentativa 2) repetiu o `toomanyrequests: Data limit exceeded`. Reapareceu tambÃ©m no SHA `123482fde`: [run 41193290224](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41193290224), etapa idÃªntica, apÃ³s trÃªs tentativas internas. A execuÃ§Ã£o no SHA `640944d97` passou em todas as simulaÃ§Ãµes, provando a natureza intermitente do registry. Nenhuma conexÃ£o ao Supabase foi feita por esses jobs: o container da simulaÃ§Ã£o Ã© descartÃ¡vel e usa `--network none`. NÃ£o farei reruns idÃªnticos enquanto o limite persistir; se necessÃ¡rio, o owner deve aguardar a recuperaÃ§Ã£o da cota ou configurar uma origem de imagem autenticada e aprovada.

**Estado atual:** no SHA `9e9e15cca`, a execuÃ§Ã£o [41194181710](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41194181710) terminou **success**, incluindo a etapa que havia falhado. O rate limit do ECR nÃ£o bloqueia o SHA atual; as falhas acima permanecem como histÃ³rico de intermitÃªncia.

### Merge da PR #184 aguardando janela de deploy

A branch altera dependÃªncias de runtime: `zod` 3 â†’ 4 e `@hookform/resolvers` 3 â†’ 5. Os testes e checks verificam a compatibilidade, mas a mudanÃ§a afeta o artefato da aplicaÃ§Ã£o. Como a instruÃ§Ã£o de CI vigente determina nÃ£o mesclar PR que possa disparar deploy de produÃ§Ã£o quando alterar cÃ³digo/dependÃªncias da aplicaÃ§Ã£o, a PR permanece aberta e pronta para revisÃ£o; nÃ£o mesclar atÃ© o owner autorizar uma janela apropriada para esse deploy. Sem merge, as correÃ§Ãµes ainda nÃ£o estÃ£o na `main` e os workflows desta lista nÃ£o podem ser declarados resolvidos na branch principal.

Na execuÃ§Ã£o mais recente observada da PR [#184](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/184), SHA `9e9e15cca`, todos os checks de produto terminaram success: E2E pÃºblico [41194181693](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41194181693), qualidade/simulaÃ§Ãµes/build [41194181710](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41194181710), responsividade, simulaÃ§Ã£o transacional e origem confiÃ¡vel [41194181700](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41194181700), CodeQL [41194181698](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41194181698), bundle [41194181714](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41194181714), Lighthouse [41194181722](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41194181722), npm audit e Gitleaks [41194181692](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41194181692). O E2E autenticado e os shards dependentes ficaram skipped porque o ambiente `e2e-qa` continua ausente; o Vercel Agent Review foi neutral por billing desabilitado. A jornada autenticada permanece sem prova atÃ© a configuraÃ§Ã£o do projeto isolado e secrets de QA pelo owner.

**Check auxiliar do Copilot na PR:** o check [41194779827](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41194779827/job/124518649729) terminou failure em `Processing Request (Linux)`. A anotaÃ§Ã£o disponÃ­vel informa somente `Process completed with exit code 1`; o trecho de log acessÃ­vel nÃ£o revela causa acionÃ¡vel. Ã‰ uma integraÃ§Ã£o de revisÃ£o auxiliar, nÃ£o um check de produto. Sem causa identificÃ¡vel, nÃ£o hÃ¡ correÃ§Ã£o segura a aplicar no repositÃ³rio; requer diagnÃ³stico do provedor/owner. Os checks de produto no SHA `9e9e15cca` permanecem verdes conforme a lista acima.

## RevalidaÃ§Ã£o do estado â€” 2026-10-31 â€” PR #184, SHA `78eb93b02e88bb11d2767c13f7445850466afa75`

Esta atualizaÃ§Ã£o substitui afirmaÃ§Ãµes de â€œestado atualâ€ anteriores que ainda apontavam para o SHA `9e9e15cca`. As seÃ§Ãµes anteriores preservam o histÃ³rico das execuÃ§Ãµes e nÃ£o devem ser interpretadas como situaÃ§Ã£o atual.

- PR #184 segue aberta, sem merge, e depende de aprovaÃ§Ã£o de review. Os checks de produto no SHA `78eb93b` passaram (qualidade/simulaÃ§Ãµes/build, E2E pÃºblico, audit/Gitleaks, CodeQL, gate transacional, responsividade, origem, bundle e Lighthouse). A jornada E2E autenticada e os shards foram **skipped**.
- A consulta ao GitHub confirmou que o environment protegido `e2e-qa` retorna 404 e nÃ£o estÃ¡ configurado. O `e2e-staging` existente nÃ£o tem proteÃ§Ã£o/polÃ­tica adequada e nÃ£o Ã© substituto seguro. **AÃ§Ã£o do owner:** criar projeto Supabase exclusivo de QA, environment `e2e-qa` com regras/revisores, secrets/variÃ¡veis e personas sintÃ©ticas; depois disso, executar os workflows autorizados e confirmar os jobs autenticados. NÃ£o registrar valores secretos.
- O check auxiliar Copilot Reviewer [41195466764](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41195466764) falhou por HTTP 402/quota do serviÃ§o. Ã‰ bloqueio de billing/limite externo, nÃ£o de produto. Vercel Agent Review estÃ¡ `neutral` por billing desabilitado.
- A `main` continua no SHA `e9d59026793b84fabeaeec9da890a068f64d49c3`. Ledger drift [41175713780](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41175713780), publicaÃ§Ã£o de Edge Functions [40772348102](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40772348102), Security Scan [40602983158](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983158), Qualidade contÃ­nua [40602982964](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982964) e CodeQL [40602983073](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983073) sÃ£o falhas da Ãºltima execuÃ§Ã£o da main observada; precisam de nova execuÃ§Ã£o nela para confirmar resoluÃ§Ã£o. Checks verdes de PR nÃ£o contam como prova pÃ³s-merge.
- A correÃ§Ã£o de dependÃªncias em PR #184 removeu os findings altos de `undici`/`zod`: `npm run check:npm-audit` e o check remoto no SHA `78eb93b` passaram. As entradas acima que descrevem npm audit como bloqueio atual permanecem apenas como histÃ³rico do diagnÃ³stico.
- A tela GestÃ£o de Compras foi ajustada localmente para remover nÃºmeros operacionais fabricados e substituir a aprovaÃ§Ã£o em lote inerte por links para a fila real e para o painel. O candidato passou build, lint/typecheck baseline, suÃ­te completa (5.857 testes aprovados, 68 skipped) e cenÃ¡rios (227/227); duas verificaÃ§Ãµes novas confirmam a ausÃªncia dos valores fictÃ­cios e os destinos de navegaÃ§Ã£o. A alteraÃ§Ã£o e seus testes ainda aguardam commit e novo CI remoto.
- NÃ£o houve execuÃ§Ã£o de migration, alteraÃ§Ã£o no Supabase, deploy remoto ou leitura/gravaÃ§Ã£o de secrets.

**PrÃ³ximo passo:** registrar e enviar a correÃ§Ã£o de GestÃ£o de Compras e esta atualizaÃ§Ã£o documental na PR #184; repetir os gates locais apÃ³s o commit, acompanhar o CI do novo SHA e manter bloqueadas a validaÃ§Ã£o E2E autenticada e a resoluÃ§Ã£o das falhas de `main` atÃ© haver QA isolado e merge autorizado.

## Estado posterior ao commit `4cca418c` â€” 2026-10-31

Esta seÃ§Ã£o substitui como estado atual os apontamentos anteriores que diziam que a correÃ§Ã£o de GestÃ£o de Compras aguardava commit ou novo CI.

- **ECR â€” intermitÃªncia observada, sem bloqueio no SHA atual:** no run [41197769071](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41197769071), tentativa inicial e rerun (tentativa 2) nÃ£o iniciaram a simulaÃ§Ã£o PostgreSQL descartÃ¡vel: trÃªs pulls de `public.ecr.aws/supabase/postgres:17.6.1.063` falharam com `toomanyrequests: Data limit exceeded`. PorÃ©m, o workflow completo mais recente no SHA `e466ef7f7` passou pela mesma etapa em [41199507236](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41199507236). Tratar as ocorrÃªncias anteriores como histÃ³rico de throttling do registry; nÃ£o hÃ¡ bloqueio ECR ativo no SHA atual. O container de simulaÃ§Ã£o usa `--network none`; nÃ£o altera Supabase.
- **E2E autenticado pendente:** a API GitHub nÃ£o encontra o environment `e2e-qa` (404). O existente `e2e-staging` nÃ£o tem proteÃ§Ã£o adequada. Owner: criar projeto Supabase exclusivo para QA, proteger o environment, configurar variÃ¡veis/secrets e personas sintÃ©ticas, sem registrar valores secretos; depois, executar o dispatch autorizado.
- **Copilot Reviewer:** [run 41197777721](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41197777721) falhou por quota HTTP 402. AÃ§Ã£o do owner: liberar/aguardar cota do serviÃ§o; nÃ£o Ã© falha de produto.
- **Review e janela de merge:** PR [#184](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/184) continua aberta e requer aprovaÃ§Ã£o humana. A mudanÃ§a inclui dependÃªncias runtime (`zod` 3â†’4 e `@hookform/resolvers` 3â†’5); aguardar janela autorizada antes de mesclar.
- **Falhas da `main` nÃ£o resolvidas:** a Ãºltima execuÃ§Ã£o observada continua no SHA `e9d59026793b84fabeaeec9da890a068f64d49c3`. Ledger [41175713780](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41175713780), publicaÃ§Ã£o Edge Functions [40772348102](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40772348102), Security Scan [40602983158](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983158), Qualidade contÃ­nua [40602982964](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982964) e CodeQL [40602983073](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983073) permanecem falhos atÃ© novos runs elegÃ­veis na `main` terminarem em success.
- Localmente, o commit `4cca418c` passou build, lint/typecheck baseline, Vitest (5.857 passados, 68 skipped), cenÃ¡rios (227/227) e npm audit. Checks verdes de PR nÃ£o provam resoluÃ§Ã£o na `main`.

### PR #186 â€” bloqueios atualizados em `3838556b6`

- `npm audit` e o gate da Qualidade contÃ­nua falham porque a branch ainda parte da `main` com findings altos de `undici`/`zod`; a correÃ§Ã£o estÃ¡ na PR #184. Revalidar apÃ³s atualizaÃ§Ã£o da base.
- CodeQL falhou no [run 41198505613](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41198505613): `Autobuild` nÃ£o conseguiu produzir SARIF com as referÃªncias desalinhadas herdadas da base (4.39.1/4.38.2). A PR #184 inclui o alinhamento.
- **AtenÃ§Ã£o â€” E2E remoto, destino nÃ£o comprovado:** o [run 41198505589](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41198505589) falhou no step `Validar autorizaÃ§Ã£o remota e RLS tÃ©cnico`: timeout de 45 s no `beforeAll` de `e2e-cleanup-rate-limit`, timeouts de 15 s em UPDATE/DELETE anon e chamada a `system-healthcheck`. O workflow herdado pode ter tentado inserir uma canary; nÃ£o Ã© possÃ­vel afirmar se houve efeito, nem qual projeto foi destino sem ver as secrets. **NÃ£o rerodar.** AÃ§Ã£o do owner: verificar privadamente o projeto e a canary no perÃ­odo do run; nÃ£o publicar credenciais. A PR #184 substitui essa execuÃ§Ã£o de PR por testes sem secrets e reserva E2E remoto a `e2e-qa` allowlisted.
- Portal, Bundle e Lighthouse passaram ([41198505598](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41198505598), [41198505662](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41198505662), [41198505614](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41198505614)). Copilot falhou em [41198512274](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41198512274), mas o resumo nÃ£o expÃµe causa acionÃ¡vel; depende de diagnÃ³stico do provedor/owner.
- PR #186 segue aberta sem certificaÃ§Ã£o remota completa; nÃ£o mesclar atÃ© a base e todos os checks obrigatÃ³rios estarem verdes. Nenhum deploy foi feito.

### CI completo da PR #184 no SHA `e466ef7f7` â€” 2026-10-31

Todos os workflows de produto foram **success**: E2E pÃºblico [41199507198](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41199507198), Security Scan [41199507206](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41199507206), Qualidade/simulaÃ§Ãµes/build [41199507236](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41199507236), CodeQL [41199507174](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41199507174), Portal Sicoob [41199507176](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41199507176), Bundle [41199507187](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41199507187) e Lighthouse [41199507235](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41199507235). E2E autenticado/shards ficaram skipped porque `e2e-qa` nÃ£o existe. Copilot [41199514763](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41199514763) falhou em `Processing Request (Linux)`; o resumo do provedor nÃ£o informa causa acionÃ¡vel. Permanecem pendentes review humano e janela de deploy para mesclar #184; a ausÃªncia de QA autenticado tambÃ©m impede declarar certificaÃ§Ã£o completa.

## InventÃ¡rio atualizado â€” Ãºltima execuÃ§Ã£o por workflow na `main` (2026-10-31)

Este inventÃ¡rio substitui os snapshots antigos acima. Nenhuma migration, SQL, deploy de funÃ§Ã£o ou escrita no banco canÃ´nico foi executada durante esta auditoria.

| Workflow | Ãšltima execuÃ§Ã£o na `main` | Causa / evidÃªncia | AÃ§Ã£o e estado |
|---|---|---|---|
| Migration ledger drift | [41175713780](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41175713780) â€” failure | Step 6: `[ledger] VerificaÃ§Ã£o indisponÃ­vel (Error); nenhum resultado aprovado.`. O log do run nÃ£o contÃ©m a causa interna. | PR #184 inclui mensagem de erro sanitizada e teste local; aguarda nova execuÃ§Ã£o autorizada na `main` para revelar a causa sem expor chaves. Nenhuma migration aplicada. |
| Publicar funÃ§Ãµes Sicoob | [40772348102](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40772348102) â€” failure | O CLI informou `No change found` para `sicoob-approval-reconciliation`; versÃ£o anterior e atual eram 5. O verificador exigia aumento de versÃ£o e gerou falso negativo apÃ³s deploy sem alteraÃ§Ãµes. | PR #186 exige funÃ§Ã£o Ãºnica e ativa, versÃ£o vÃ¡lida e sem regressÃ£o; 7 testes focais passaram localmente. O verificador atesta metadados, nÃ£o o hash do bundle. NÃ£o reexecutei o deploy. |
| Security Scan | [40602983158](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983158) â€” failure | `npm audit` reportou `undici` e `zod` com severidade alta. | PR #185 atualiza `undici`/Zod e o check remoto `npm audit` no SHA `2edff699` passou; sem merge atÃ© a revisÃ£o/deploy seguro. Restam 15 findings moderados, sem gate high/critical. |
| Qualidade contÃ­nua | [40602982964](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982964) â€” failure | Mesmo gate `check:npm-audit`; parou com as duas CVEs altas. | Mesma causa e correÃ§Ã£o da PR #185; CI remoto do novo SHA ainda estÃ¡ em andamento. |
| CodeQL | [40602983073](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983073) â€” failure | `init` 4.39.1 versus `autobuild/analyze` 4.38.2; anÃ¡lise nÃ£o gerou SARIF. | CorreÃ§Ã£o estÃ¡ na PR #184 e commit correspondente tambÃ©m foi incorporado Ã  PR #185; nova anÃ¡lise remota estÃ¡ em andamento. |

**Verdes na Ãºltima execuÃ§Ã£o da `main`:** Branch Protection Sentinel [40602983038](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983038), Enterprise Compliance [40602982958](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982958) e Portal Sicoob [39868499315](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39868499315). Estes runs precedem os PRs em aberto.

## Bloqueios externos e validaÃ§Ãµes que ainda faltam

- **E2E autenticado e RLS remoto:** confirmei que a API do GitHub retorna `404 Not Found` para o environment `e2e-qa`. O owner informou que configuraria o ambiente. Criar o environment protegido, projeto Supabase descartÃ¡vel, secrets/personas e variÃ¡veis descritas na seÃ§Ã£o anterior; depois executar `workflow_dispatch` na `main`. NÃ£o usar os projetos canÃ´nicos `cfmzkthhgliqelozlmwu` nem `doufsxqlfjyuvxuezpln`.
- **RevisÃ£o Copilot:** run da PR #185 [41183332482](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41183332482) falhou com `SessionModelError`, HTTP 402, `errorCode=quota` (â€œadditional usage limitâ€ do plano). AÃ§Ã£o do owner: revisar a cota em `github.com/settings/copilot/features`; o check nÃ£o pode ser corrigido por alteraÃ§Ã£o de cÃ³digo.
- **Merge/deploy:** as PRs #184 e #185 incluem mudanÃ§as de configuraÃ§Ã£o CI e/ou dependÃªncias/cÃ³digo de aplicaÃ§Ã£o. NÃ£o mesclar se a polÃ­tica de produÃ§Ã£o for disparada pelo merge de alteraÃ§Ã£o da aplicaÃ§Ã£o; manter abertas atÃ© revisÃ£o do owner e janela segura. A PR #186 sÃ³ corrige workflow manual e nÃ£o foi executada contra o Supabase.

### AtualizaÃ§Ã£o dos checks remotos das PRs (2026-10-31)

- **PR #184:** `npm audit` e `SeguranÃ§a, contratos e build` falharam na SHA `2accc783`; estes checks antecedem a correÃ§Ã£o de dependÃªncias da PR #185. CodeQL, E2E pÃºblico, responsividade, verba/aprovaÃ§Ã£o e demais checks reportados passaram; `e2e-authenticated` foi `skipped` conforme a proteÃ§Ã£o de secrets em PRs. EvidÃªncia: runs [41181549625](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41181549625), [41181549634](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41181549634) e [41181549751](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41181549751).
- **PR #185, SHA `2edff699`:** `npm audit`, Gitleaks, origem confiÃ¡vel, verba/aprovaÃ§Ã£o, Lighthouse, responsividade e bundle passaram. E2E, build/contratos e CodeQL ainda estavam `in_progress` na Ãºltima consulta. RevisÃ£o Copilot falhou por quota [41183332482](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41183332482). Esses checks ainda nÃ£o certificam a PR inteira.
- **PR #186, SHA `d721f3a2`:** sÃ³ hÃ¡ Preview success, Agent Review neutral e Copilot failure por quota [41182966896](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41182966896); nÃ£o hÃ¡ checks de CI da aplicaÃ§Ã£o visÃ­veis apÃ³s a alteraÃ§Ã£o de base para `main`. Portanto, a validaÃ§Ã£o local registrada nÃ£o equivale a CI remoto aprovado.
- **DecisÃ£o:** manter as trÃªs PRs abertas. NÃ£o fazer merge enquanto houver checks obrigatÃ³rios pendentes/falhos, enquanto o ambiente de QA nÃ£o for validado e sem confirmar se o merge dispara deploy de produÃ§Ã£o. O banco Supabase canÃ´nico permaneceu somente leitura.
- **ValidaÃ§Ã£o posterior do worktree #186:** build, lint, lint baseline, typecheck e typecheck baseline passaram; suÃ­te completa: 5.843 aprovados e 68 skipped. `npm run check:npm-audit` falhou por `undici` e `zod` high na base `main`; a correÃ§Ã£o estÃ¡ na PR #185 e nÃ£o foi incorporada a esta branch. NÃ£o foram alterados os gates nem os testes.

### AtualizaÃ§Ã£o do verificador de Edge Functions â€” 2026-10-31

- A PR #186 foi endurecida em revisÃ£o local: o inventÃ¡rio exige exatamente uma entrada para cada uma das sete funÃ§Ãµes e estado `ACTIVE`; versÃµes sÃ£o validadas sem coerÃ§Ã£o numÃ©rica frouxa. A comparaÃ§Ã£o admite igualdade para tratar o `No change found` do CLI, exige nÃ£o regressÃ£o e rejeita estado ou versÃ£o ausentes/invÃ¡lidos. Um teste garante que o conjunto de funÃ§Ãµes do workflow permanece em paridade com o cÃ³digo do verificador.
- Testes focais atuais: **7/7 aprovados**; ESLint direcionado, `actionlint` e `git diff --check` sem erros. A checagem local nÃ£o chamou o Supabase nem prova o conteÃºdo/hash efetivamente servido.
- O novo commit ainda precisa passar pelos checks remotos da PR #186. As falhas jÃ¡ registradas de audit/build/CodeQL/E2E pertencem a um SHA anterior e Ã  base antiga; consultar os checks do head novo antes de decidir merge.
- NÃ£o houve dispatch do workflow, uso de token ou publicaÃ§Ã£o de Edge Functions.
---

## Migration T031 â€” retry de status por usuÃ¡rio inativo

**Estado:** correÃ§Ã£o implementada e simulada localmente; sem aplicaÃ§Ã£o remota.

**Motivo do bloqueio:** o ambiente Supabase isolado de construÃ§Ã£o e seu project ref ainda nÃ£o foram confirmados. O executor versionado estÃ¡ restrito ao ref `cfmzkthhgliqelozlmwu`, que nÃ£o foi confirmado como projeto de construÃ§Ã£o independente; portanto a migration `20261030210000_require_active_actor_for_quote_status_retry.sql` nÃ£o foi adicionada Ã  allowlist e nÃ£o foi executada. Nenhuma migration, funÃ§Ã£o ou dado remoto foi alterado.

**PrÃ³xima aÃ§Ã£o necessÃ¡ria:** confirmar o ref e as credenciais do projeto Supabase de homologaÃ§Ã£o/construÃ§Ã£o; revisar o diff da PR e os checks; somente entÃ£o acrescentar a migration Ã  allowlist restrita ao ref aprovado e executar preflight, aplicaÃ§Ã£o e verificaÃ§Ã£o de ledger/definiÃ§Ã£o/ACL nesse projeto. NÃ£o usar o banco canÃ´nico nem o banco de produtos como fallback.

**Prova local:** PostgreSQL 17 descartÃ¡vel, rede desativada. O cenÃ¡rio reproduz o acesso indevido com o wrapper anterior e confirma que o novo wrapper nega com `42501` antes de chamar o nÃºcleo; o retry de vendedor ativo segue autorizado. Ver `RELATORIO_CI.md`, seÃ§Ã£o â€œBaseline e correÃ§Ã£o T031â€.
## PendÃªncias atuais â€” auditoria de 31/10/2026

Este inventÃ¡rio substitui os status histÃ³ricos acima para as falhas ainda abertas no `main` SHA `e9d59026793b84fabeaeec9da890a068f64d49c3` e nas PRs revisadas.

### 1. E2E autenticado â€” secrets de homologaÃ§Ã£o ausentes

- **PR/run:** #179, [E2E run 41164617193](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41164617193).
- **Erro exato do preflight:** `Configure secrets dedicados E2E para URL, projeto, chaves e contas de homologaÃ§Ã£o. Nenhum teste remoto foi iniciado.`
- **Causa:** faltam no escopo lido pelo workflow `E2E_SUPABASE_URL`, `E2E_SUPABASE_PUBLISHABLE_KEY`, `E2E_SUPABASE_PROJECT_ID` e `E2E_SUPABASE_SERVICE_ROLE_KEY` (alÃ©m de `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e `VITE_SUPABASE_PROJECT_ID` na validaÃ§Ã£o correspondente). O workflow deste SHA lÃª secrets do repositÃ³rio e nÃ£o declara `environment: e2e-staging`; preencher apenas secrets/variables do environment nÃ£o o destrava.
- **AÃ§Ã£o do owner:** configurar os secrets necessÃ¡rios em Settings â†’ Secrets and variables â†’ Actions no escopo que o workflow lÃª, sem compartilhar os valores no chat; depois solicitar/permitir uma nova execuÃ§Ã£o do E2E. O owner respondeu â€œSim, vou configurarâ€, mas a execuÃ§Ã£o verificada ainda falhou antes dos testes e os metadados continuam sem os nomes obrigatÃ³rios.
- **SeguranÃ§a:** nÃ£o ler, copiar ou registrar valores de secrets. Nenhuma execuÃ§Ã£o autenticada foi certificada.

### 2. DependÃªncias altas no `main`

- **Workflows:** [Security Scan run 40602983158](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983158) e [Qualidade contÃ­nua run 40602982964](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982964).
- **Erro resumido:** o audit reporta `undici` (high) e `zod` (high). O commit `266b21de` nÃ£o toca dependÃªncias. Uma correÃ§Ã£o candidata consta em branches/PRs de integraÃ§Ã£o, mas nÃ£o estÃ¡ na `main`; nÃ£o considerar o bloqueio encerrado antes de executar os dois gates na `main` apÃ³s merge aprovado.

### 3. CodeQL na `main`

- **Workflow:** [CodeQL run 40602983073](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983073).
- **Erro resumido:** `init` configurado em v4.39.1 e `autobuild`/`analyze` em v4.38.2; autobuild falha e nÃ£o gera `sarif-results/*.sarif`, levando tambÃ©m Ã  falha do upload. Uma candidata em PR #179 ficou verde no check CodeQL, mas o PR segue em rascunho e bloqueado pelo E2E. Confirmar o check na `main` apÃ³s integraÃ§Ã£o.

### 4. PublicaÃ§Ã£o das Edge Functions â€” verificador rejeita no-op idempotente

- **Workflow:** [Publicar funÃ§Ãµes Sicoob run 40772348102](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40772348102).
- **Erro:** `sicoob-approval-reconciliation permaneceu na versÃ£o 5 (anterior: 5)` na etapa de confirmaÃ§Ã£o, apÃ³s as sete chamadas de publicaÃ§Ã£o jÃ¡ terem ocorrido. Logo, a execuÃ§Ã£o nÃ£o prova ausÃªncia de mudanÃ§as remotas.
- **Candidata:** PR #179 adiciona verificaÃ§Ã£o de estado/versÃµes que aceita versÃ£o igual para execuÃ§Ã£o idempotente e detecta versÃµes regressivas/funÃ§Ãµes inativas. NÃ£o hÃ¡ deploy ou `workflow_dispatch` novo. O gate nÃ£o comprova hash do bundle correspondente ao SHA; o inventÃ¡rio de funÃ§Ãµes nÃ£o oferece digest. AlÃ©m disso, a verificaÃ§Ã£o acontece depois das chamadas de deploy.
- **AÃ§Ã£o:** manter sem execuÃ§Ã£o manual atÃ© PR integralmente validada e projeto alvo confirmado. NÃ£o reexecutar em nome de idempotÃªncia sem revisar o estado atual e o escopo de publicaÃ§Ã£o.

### 5. Paridade das migrations â€” PR #151 bloqueada

- **PR:** [#151](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/151), aberta, nÃ£o mesclada; 5 checks falham.
- **Paridade no Git:** 12 arquivos de migration ausentes da `main` estÃ£o presentes no PR #151. A alegaÃ§Ã£o de que correspondem Ã s 137 entradas do ledger remoto consta na descriÃ§Ã£o da PR; nÃ£o foi revalidada no banco nesta execuÃ§Ã£o.
- **Achados de revisÃ£o:** (a) `20261016171500_secure_public_favorite_share_rpc.sql` revoga SELECT de `anon`, enquanto `PublicFavoriteListPage` consulta as tabelas diretamente, potencialmente quebrando links compartilhados; (b) `20261016173000_remove_redundant_pa_budget_select_policy.sql` remove polÃ­tica buyer sem prova de que a polÃ­tica consolidada preserva o acesso de `comprador_singular` a todos os orÃ§amentos esperados.
- **AÃ§Ã£o:** corrigir os contratos/coberturas no PR, validar replay e CI antes de merge. NÃ£o reaplicar migrations, executar `db reset` ou alterar o banco canÃ´nico para reconciliar este registro.

### 6. Webhooks â€” limite de memÃ³ria e CI remoto do PR #180

- **PR:** [#180](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/180), SHA `266b21de7d994105fcbae0ba2ea2dce860e3fdda`.
- **CorreÃ§Ã£o local publicada:** ao truncar um chunk acima do limite, o helper usa `slice()` para guardar uma cÃ³pia do prefixo em buffer compacto, em vez de manter uma view do `ArrayBuffer` inteiro. `deno test` do helper (4/4), contrato Vitest (10/10), suÃ­te completa (5.840/68), typecheck, lint, build, Deno check e actionlint passaram.
- **Bloqueios:** apÃ³s o push, o CodeQL [41166888455](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41166888455) falhou em `Autobuild`: `Loaded a configuration file for version '4.39.1', but running version '4.38.2'`. O upload SARIF falhou por consequÃªncia. Na consulta de 31/10/2026, os outros seis workflows disparados neste SHA ainda estavam queued/pending; consultar novamente antes de fechar o item. O `npm run check:npm-audit` local continua detectando `undici` e `zod` altos, por nÃ£o fazerem parte deste patch.

### 7. Banco canÃ´nico e deploy

Nenhuma escrita SQL, migration, alteraÃ§Ã£o de configuraÃ§Ã£o ou deploy do Supabase foi realizado nesta auditoria. As aÃ§Ãµes remotas acima permanecem limitadas a consulta de estado do GitHub.
Nenhuma escrita SQL, migration, alteração de configuração ou deploy do Supabase foi realizado nesta auditoria. As ações remotas acima permanecem limitadas a consulta de estado do GitHub.

---

## Atualização supersedente — 31/10/2026

### PR #180 — estado do head `d92da2d0b3b790ec3a7c3aea9983f94302dcdad7`

- [Qualidade contínua, run 41167348323](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41167348323): `failure` porque o audit encontra `undici` e `zod` com severidade alta. O step combinado não reportou falha própria de autorização de Edge Function.
- [Security Scan, run 41167348518](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41167348518): `failure` pelo mesmo audit. Gitleaks passou.
- [E2E, run 41167348319](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41167348319): `in_progress` na última consulta.
- [Portal Sicoob, run 41167348375](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41167348375): `queued` na última consulta.
- [Bundle Size, run 41167348277](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41167348277), [CodeQL, run 41167348293](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41167348293) e [Lighthouse, run 41167348305](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41167348305): `success`.
- Ação: tratar dependências em PR isolada; manter PR #180 sem merge enquanto os gates obrigatórios falham ou não terminam.

### PR #151 — correções locais ainda sem CI remoto

- HEAD remoto: `239a25cc133c10dea848ed97d3e77a6e521612e4`. [E2E run 40779162142](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40779162142) falha no smoke “Dashboard customizável”: `page-title-dashboard` não aparece em 19.999 ms (`flows/20-all-features-smoke.spec.ts:218`). Esta falha funcional não é falta de credenciais.
- Commit local `2aa996bae` restaura a leitura de verbas para compradores e corrige o falso positivo na simulação. A migration está versionada no branch isolado, ainda não enviada e não aplicada. A simulação usa PostgreSQL descartável; banco canônico inalterado.
- O patch de favoritos públicos está local e será separado após validação. Dependências altas, mismatch CodeQL e quota Copilot continuam como bloqueios conhecidos do SHA remoto. Não fazer merge até obter novo CI verde.

### Banco e deploy

Nenhuma migration foi aplicada ao Supabase canônico e nenhum deploy foi executado nesta atualização.

## Pendências supersedentes — consulta de 31/10/2026

### 1. Workflows que continuam falhando na `main`

| Workflow | Run | Bloqueio e ação para fechar |
|---|---|---|
| Publicar funções Sicoob | [40772348102](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40772348102) | O verificador pós-publicação recusa versão igual (5→5) após publicar. Corrigir a regra de idempotência e validar estado/hash antes de nova publicação; nenhuma reexecução manual feita. |
| Security Scan | [40602983158](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983158) | `npm audit` bloqueia `undici` e `zod` high. A candidata #179 atualiza `undici` na mesma major e `zod` v3→v4; concluir revisão de compatibilidade antes de merge. |
| Qualidade contínua | [40602982964](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982964) | Mesma causa de dependências high. |
| CodeQL | [40602983073](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983073) | Digests de `autobuild`/`analyze` executam v4.38.2 enquanto configuração espera v4.39.1. Correção já está candidata nas PRs #179/#180/#151; exige confirmação na `main` depois de integração aprovada. |

Workflows verdes a preservar: Migration ledger drift [41013281253](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41013281253), Branch Protection Sentinel [40602983038](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983038), Enterprise Compliance [40602982958](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982958) e Portal Sicoob [39868499315](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39868499315).

### 2. PR #151 — inventário/API e migration RLS

- Head remoto `b18b662b179bb75dc4ffe10874ee5a6a6db6cf92`; PR continua aberta. Novos runs [Qualidade 41169596475](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41169596475), [Security 41169596556](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41169596556), [CodeQL 41169596496](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41169596496), [E2E 41169596483](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41169596483) e demais workflows ainda estavam `queued`/`pending` na consulta de 31/10 às 04:43 UTC.
- Qualidade no SHA anterior apontou RPCs `get_public_favorite_list` e `get_public_favorite_reactions` ausentes do snapshot capturado em 14/10. A consulta de catálogo SQL no banco pelo MCP expirou por timeout. Ação necessária: obter uma leitura administrativa do contrato atual e confirmar se as migrations RPC da PR já estão aplicadas; só então atualizar o snapshot real ou registrar que a migration ainda está pendente. Não incluir os nomes manualmente na allowlist com base apenas no SQL local.
- Migration `20261031042808_secure_public_favorite_reactions_access.sql` e simulador foram commitados em `6f2e71821`. A simulação PostgreSQL descartável passou para acesso direto, owner/admin, RPC pública, tokens inválido/expirado e escrita `service_role`. O erro inicial `existing_policy.tablename` foi corrigido antes do commit. O banco canônico não foi alterado; revisão e aplicação em ambiente de construção continuam pendentes.
- CodeQL foi alinhado em `b18b662b1`; o novo run ainda aguardava execução. O E2E novo também aguardava execução; o histórico de #151 registra falha funcional do marcador de Dashboard, enquanto #179 tem outro bloqueio de credentials.

### 3. E2E autenticado na PR #179

- Run [41164617193](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41164617193) falhou no preflight; nenhum teste remoto começou.
- Não aparecem na listagem de nomes dos repository secrets: `E2E_SUPABASE_URL`, `E2E_SUPABASE_PUBLISHABLE_KEY`, `E2E_SUPABASE_PROJECT_ID` e `E2E_SUPABASE_SERVICE_ROLE_KEY`. Os nomes `E2E_ADMIN_*`, `E2E_USER_*` etc. existentes não substituem credenciais do projeto isolado exigidas pelo preflight.
- Ação do owner: adicionar secrets no escopo que o workflow lê, sem compartilhar valores no chat; então aguardar/reexecutar pelo fluxo normal e exigir que os testes realmente iniciem. Não ler nem registrar valores.

### 4. PR #180

- No SHA `d92da2d0b3b790ec3a7c3aea9983f94302dcdad7`, Qualidade [41167348323](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41167348323) e Security [41167348518](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41167348518) falharam pelo audit de `undici`/`zod`.
- E2E [41167348319](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41167348319) falhou no gate fail-fast após timeout do smoke Dashboard. Portal [41167348375](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41167348375), Bundle [41167348277](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41167348277), CodeQL [41167348293](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41167348293) e Lighthouse [41167348305](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41167348305) passaram.

### Regra de segurança operacional

Sem merge, deploy, aplicação remota de migration ou escrita SQL no banco canônico durante esta execução. Não aprovar PR com checks obrigatórios vermelhos/pendentes; não reexecutar o workflow de deploy até o verificador ser corrigido e o alvo/estado serem confirmados.


## Pendências supersedentes — consulta GitHub e banco somente leitura (31/10/2026, 04:57 UTC)

### Falhas na `main` — última execução por workflow

A branch continua no SHA `e9d59026793b84fabeaeec9da890a068f64d49c3`; permanecem as quatro falhas e os quatro workflows verdes descritos na atualização supersedente anterior. Não houve merge; portanto não há regressão nova na `main` causada por esta sessão.

### PR #151 — bloqueios atuais no SHA `b18b662b179bb75dc4ffe10874ee5a6a6db6cf92`

- **Security Scan** [41169596556](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41169596556): `npm audit` encontrou `undici`, `zod` e `minimatch` em severidade alta. Não usar `--force`, downgrade, nem afrouxar o gate.
- **Qualidade contínua** [41169596475](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41169596475): o cache de catálogo de 14/10 não contém `get_public_favorite_list` e `get_public_favorite_reactions`, referenciadas pelo serviço público. MCP anterior expirou; obter estado remoto em modo somente leitura e confirmar se a migration está aplicada antes de gerar snapshot. Não incluir RPCs na allowlist apenas pelo SQL local.
- **E2E** [41169596483](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41169596483): hook `beforeAll` de `e2e_cleanup_rate_limit` excedeu 45 s (linha 71). Shards foram skipped. É falha de timeout no setup remoto; não constitui prova de policy quebrada nem de jornada autenticada aprovada.
- **Sucessos:** CodeQL [41169596496](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41169596496), Bundle [41169596497](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41169596497), Lighthouse [41169596480](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41169596480). **Sem conclusão:** Portal Sicoob [41169596490](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41169596490) e Copilot Review [41169603429](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41169603429) continuavam `queued`.

### Risco de escrita remota pelo E2E e ação necessária

O workflow deste SHA mapeia secrets gerais `VITE_SUPABASE_*` e `SUPABASE_SERVICE_ROLE_KEY` para teste que insere/remove registros sintéticos `rls-e2e-*`. Uma consulta SQL somente leitura ao banco canônico encontrou um registro desse prefixo atualizado às `2026-10-31 04:50:03 UTC`, durante a execução E2E `41169596483` (04:48–04:51 UTC). A coincidência temporal sugere possível escrita pelo teste, mas não comprova que o registro é o canário daquele run, porque o UUID não foi emitido no log. A auditoria não alterou nem apagou dados. **Não executar novos E2E usando as secrets gerais.** O run E2E [41170083965](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41170083965) da PR #180 foi cancelado antes de iniciar. O proprietário deve confirmar no painel/destino se o registro é resíduo e decidir a limpeza; não realizar exclusão pelo MCP durante esta tarefa. A branch #180 contém localmente, ainda sem commit, a guarda que exige as quatro secrets E2E dedicadas e bloqueia project ref canônico antes de qualquer teste com service role; validar, commitar e observar o novo run fail-fast se as secrets ainda faltarem. A PR #179 contém esse guard, porém está bloqueada porque os secrets dedicados de homologação ainda faltam.

### PR #179 / #180

- PR #179: os checks de segurança, qualidade, CodeQL, bundle, Lighthouse e Portal passaram; E2E [41164617193](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41164617193) parou no preflight por ausência de `E2E_SUPABASE_URL`, `E2E_SUPABASE_PUBLISHABLE_KEY`, `E2E_SUPABASE_PROJECT_ID` e `E2E_SUPABASE_SERVICE_ROLE_KEY`. O usuário informou que configuraria; os nomes ainda não estão disponíveis no escopo do workflow. Não ler os valores.
- PR #180 no SHA `d1e8bb1ada89b611c75173184c66b9c00dfd0ef2`: Qualidade [41170084002](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41170084002) falhou por advisories `undici`/`zod`; Bundle [41170083959](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41170083959) passou; Security, CodeQL, E2E, Lighthouse e Portal permaneciam em fila na consulta. Não afirmar sucesso ou mergeabilidade enquanto pendentes.

### Revisão da migration RLS de favoritos

A simulação PostgreSQL 17 descartável passou, mas não cobre o catálogo, roles e grants do banco remoto. Revisão independente identificou: (1) migration não reexecutável, pois o preflight exige policy INSERT que a própria migration remove; (2) ausência de validação de DELETE autenticado e da minimização de `user_agent`/`ip_hash` no SELECT direto do owner. Resolver/justificar esses pontos e validar estado remoto por leitura antes de aplicar em qualquer ambiente. Nenhuma migration foi aplicada.

### Gates locais e limites operacionais

Os testes locais registrados não caíram: #151 segue em 5.846 aprovados / 68 ignorados, lint com 873 avisos e zero erros, typecheck e build aprovados; #180 segue em 5.840 aprovados / 68 ignorados, mesmos avisos de lint e build/typecheck aprovados. CI remoto ainda tem falhas acima. Banco canônico permanece sem escrita manual; sem merge, deploy, rerun ou execução de migration.

## Estado após o push da proteção E2E — 31/10/2026, 05:01 UTC

- Commit `30da52ae6f9e17c2e148adea72b57d579802b376` está na PR #180. O workflow E2E agora exige os quatro secrets dedicados e valida HTTPS, correspondência URL/project ref e rejeição dos dois refs canônicos antes de usar service role.
- O run inseguro anterior [41170083965](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41170083965) foi cancelado enquanto queued; conclusão `cancelled`, sem job E2E iniciado. A execução com guard [41170822637](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41170822637) ainda estava `queued`; não alegar validação remota até ver o preflight e sua conclusão.
- No SHA `30da52a`, Security [41170822624](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41170822624), CodeQL [41170822607](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41170822607), Lighthouse [41170822609](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41170822609), Portal [41170822636](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41170822636), Bundle [41170822618](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41170822618) e Qualidade [41170822641](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41170822641) estavam queued/pending.
- Gates locais pós-commit: build/typecheck passaram, lint 873 avisos e zero erros, Vitest 5.840 aprovados / 68 ignorados; `actionlint` e 4 testes específicos do guard passaram. Hook do push confirmou TS 0→0, sem regressão de lint nos arquivos de app alterados (nenhum) e 5.840/68.
- PR #180 continua draft e bloqueada pelos checks pendentes/falhos herdados; sem merge/deploy. Permanecem abertas as vulnerabilidades, o catálogo remoto RPC, o timeout E2E da PR #151, as secrets de homologação ausentes e a possível linha sintética recente no banco canônico. Não limpar a linha sem confirmação do proprietário.
