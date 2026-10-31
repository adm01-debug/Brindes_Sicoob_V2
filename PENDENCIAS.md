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

## Pendências atuais — auditoria de 31/10/2026

Este inventário substitui os status históricos acima para as falhas ainda abertas no `main` SHA `e9d59026793b84fabeaeec9da890a068f64d49c3` e nas PRs revisadas.

### 1. E2E autenticado — secrets de homologação ausentes

- **PR/run:** #179, [E2E run 41164617193](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41164617193).
- **Erro exato do preflight:** `Configure secrets dedicados E2E para URL, projeto, chaves e contas de homologação. Nenhum teste remoto foi iniciado.`
- **Causa:** faltam no escopo lido pelo workflow `E2E_SUPABASE_URL`, `E2E_SUPABASE_PUBLISHABLE_KEY`, `E2E_SUPABASE_PROJECT_ID` e `E2E_SUPABASE_SERVICE_ROLE_KEY` (além de `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e `VITE_SUPABASE_PROJECT_ID` na validação correspondente). O workflow deste SHA lê secrets do repositório e não declara `environment: e2e-staging`; preencher apenas secrets/variables do environment não o destrava.
- **Ação do owner:** configurar os secrets necessários em Settings → Secrets and variables → Actions no escopo que o workflow lê, sem compartilhar os valores no chat; depois solicitar/permitir uma nova execução do E2E. O owner respondeu “Sim, vou configurar”, mas a execução verificada ainda falhou antes dos testes e os metadados continuam sem os nomes obrigatórios.
- **Segurança:** não ler, copiar ou registrar valores de secrets. Nenhuma execução autenticada foi certificada.

### 2. Dependências altas no `main`

- **Workflows:** [Security Scan run 40602983158](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983158) e [Qualidade contínua run 40602982964](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982964).
- **Erro resumido:** o audit reporta `undici` (high) e `zod` (high). O commit `266b21de` não toca dependências. Uma correção candidata consta em branches/PRs de integração, mas não está na `main`; não considerar o bloqueio encerrado antes de executar os dois gates na `main` após merge aprovado.

### 3. CodeQL na `main`

- **Workflow:** [CodeQL run 40602983073](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983073).
- **Erro resumido:** `init` configurado em v4.39.1 e `autobuild`/`analyze` em v4.38.2; autobuild falha e não gera `sarif-results/*.sarif`, levando também à falha do upload. Uma candidata em PR #179 ficou verde no check CodeQL, mas o PR segue em rascunho e bloqueado pelo E2E. Confirmar o check na `main` após integração.

### 4. Publicação das Edge Functions — verificador rejeita no-op idempotente

- **Workflow:** [Publicar funções Sicoob run 40772348102](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40772348102).
- **Erro:** `sicoob-approval-reconciliation permaneceu na versão 5 (anterior: 5)` na etapa de confirmação, após as sete chamadas de publicação já terem ocorrido. Logo, a execução não prova ausência de mudanças remotas.
- **Candidata:** PR #179 adiciona verificação de estado/versões que aceita versão igual para execução idempotente e detecta versões regressivas/funções inativas. Não há deploy ou `workflow_dispatch` novo. O gate não comprova hash do bundle correspondente ao SHA; o inventário de funções não oferece digest. Além disso, a verificação acontece depois das chamadas de deploy.
- **Ação:** manter sem execução manual até PR integralmente validada e projeto alvo confirmado. Não reexecutar em nome de idempotência sem revisar o estado atual e o escopo de publicação.

### 5. Paridade das migrations — PR #151 bloqueada

- **PR:** [#151](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/151), aberta, não mesclada; 5 checks falham.
- **Paridade no Git:** 12 arquivos de migration ausentes da `main` estão presentes no PR #151. A alegação de que correspondem às 137 entradas do ledger remoto consta na descrição da PR; não foi revalidada no banco nesta execução.
- **Achados de revisão:** (a) `20261016171500_secure_public_favorite_share_rpc.sql` revoga SELECT de `anon`, enquanto `PublicFavoriteListPage` consulta as tabelas diretamente, potencialmente quebrando links compartilhados; (b) `20261016173000_remove_redundant_pa_budget_select_policy.sql` remove política buyer sem prova de que a política consolidada preserva o acesso de `comprador_singular` a todos os orçamentos esperados.
- **Ação:** corrigir os contratos/coberturas no PR, validar replay e CI antes de merge. Não reaplicar migrations, executar `db reset` ou alterar o banco canônico para reconciliar este registro.

### 6. Webhooks — limite de memória e CI remoto do PR #180

- **PR:** [#180](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/180), SHA `266b21de7d994105fcbae0ba2ea2dce860e3fdda`.
- **Correção local publicada:** ao truncar um chunk acima do limite, o helper usa `slice()` para guardar uma cópia do prefixo em buffer compacto, em vez de manter uma view do `ArrayBuffer` inteiro. `deno test` do helper (4/4), contrato Vitest (10/10), suíte completa (5.840/68), typecheck, lint, build, Deno check e actionlint passaram.
- **Bloqueios:** após o push, o CodeQL [41166888455](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41166888455) falhou em `Autobuild`: `Loaded a configuration file for version '4.39.1', but running version '4.38.2'`. O upload SARIF falhou por consequência. Na consulta de 31/10/2026, os outros seis workflows disparados neste SHA ainda estavam queued/pending; consultar novamente antes de fechar o item. O `npm run check:npm-audit` local continua detectando `undici` e `zod` altos, por não fazerem parte deste patch.

### 7. Banco canônico e deploy

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
