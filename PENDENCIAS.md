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


# Pendências atualizadas — 2026-10-31

Esta seção substitui snapshots anteriores para o estado atual dos workflows e do E2E. Não registrar valores de segredo neste arquivo.

## Bloqueio externo: ambiente isolado para E2E autenticado

O repositório remoto ainda não fornece evidência verificável de que os secrets de environment `e2e-qa` existem: o conector lista apenas secrets no escopo do repositório e não revela os valores/nomes definidos em environments. Os nomes `E2E_SUPABASE_URL`, `E2E_SUPABASE_PROJECT_ID`, `E2E_SUPABASE_PUBLISHABLE_KEY` e `E2E_SUPABASE_SERVICE_ROLE_KEY` não foram encontrados no escopo do repositório; isso **não prova** que estejam ausentes do environment.

Para liberar os testes remotos com segurança, concluir no GitHub:

1. Criar/confirmar um projeto Supabase exclusivo e descartável para QA; nunca usar o projeto do portal `cfmzkthhgliqelozlmwu` nem o catálogo `doufsxqlfjyuvxuezpln`.
2. Criar o environment `e2e-qa` com revisores obrigatórios.
3. Configurar nele os quatro secrets `E2E_SUPABASE_*`, `E2E_CLEANUP_TOKEN` e credenciais/TOTP das personas de teste.
4. Configurar as variáveis `E2E_ALLOWED_PROJECT_ID` e `E2E_CLEANUP_DRY_RUN=0`. O workflow falha antes dos testes se o projeto não estiver na allowlist ou se o cleanup de QA não estiver explicitamente habilitado.
5. Configurar a Edge Function `e2e-cleanup` nesse projeto com token e lista de emails exclusivos de QA.
6. Após a configuração, executar `E2E (Playwright)` e `Enterprise Compliance & Audit Reporting` por `workflow_dispatch` na `main`; confirmar todos os jobs verdes e que as fixtures foram removidas.

**Bloqueio:** enquanto esses passos não forem concluídos, a jornada autenticada completa e o teste RLS remoto permanecem sem prova de execução. O E2E público, sem secrets, pode continuar rodando em PRs.

## Bloqueio de dependências — npm audit

Os runs [Security Scan #41177996979](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41177996979) e [Qualidade contínua #41177997004](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41177997004) falharam pelo mesmo gate: `npm audit` reportou `undici` (high) e `zod` (high). `undici` tem correção sem major; `zod@3.25.76` só tem correção indicada em major 4 (>=4.6.6). Fazer uma branch de correção separada, atualizar `undici` sem major e avaliar Zod 4 com migração, typecheck, build e suíte completa. Não desativar nem enfraquecer o gate.

## E2E remoto no PR #183

O [run 41177997096](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41177997096) recebeu secrets genéricos em PR e falhou quando o `beforeAll` do teste RLS passou de 45 s. A causa operacional exata não é demonstrável porque o valor do projeto está mascarado e não há acesso aos secrets de environment. A correção proposta move a jornada autenticada para `workflow_dispatch` na main + `e2e-qa`, torna o PR estritamente público/sem secrets e faz o destino ser validado no workflow e nos testes remotos. O status remoto dessa correção só poderá ser provado após publicar a branch e aguardar o CI.

## Validação pendente: proteção dos dispatches com credenciais Supabase

Revisão transversal encontrou jobs que recebiam credenciais privilegiadas durante `workflow_dispatch` em branches arbitrárias: compliance, auditoria de performance e migration-ledger drift. Os três agora restringem o disparo manual à `main`; os workflows de aplicação de migrations e deploy de Edge Functions já tinham essa proteção. `actionlint` e os gates locais serão repetidos; só o CI de PR poderá validar a mudança de forma remota. Em `migration-ledger-drift.yml`, confirmar também que o environment `construction` mantém política de branches restrita à `main`.

O workflow Lighthouse também recebeu correção: o token da GitHub App foi removido porque o destino do upload é `filesystem`, e `continue-on-error` foi eliminado. O CI deve confirmar que o upload de artefatos e as asserções seguem verdes.

Foram removidos ainda os `continue-on-error` restantes em `sicoob-ci.yml` e `bundle-check.yml`. O CI precisa confirmar publicação de artefatos sem supressão de falhas.

O CodeQL também foi corrigido localmente ao alinhar `init`, `autobuild` e `analyze` no release 4.39.1. O run da `main` falhou antes de gerar SARIF por incompatibilidade 4.39.1/4.38.2; confirmar geração e validação de SARIF no PR.

## Falhas atuais da última execução da `main` — inventário 2026-10-31

* **Migration ledger drift — [run 41175713780](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41175713780):** step 6 terminou com exit 2 e `[ledger] Verificação indisponível (Error); nenhum resultado aprovado.`. O step 7 (auditoria RLS) completou sem findings. A causa exata não era confirmável porque o script ocultava `error.message`; agora a mensagem é exibida com Bearer/access/service/API keys redigidas, e o cenário unitário verifica essa redação. Não apliquei migrations nem executei SQL remoto. Próximo passo: validar diagnóstico numa execução posterior autorizada na main.
* **Publicar funções Sicoob — [run 40772348102](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40772348102):** o CLI respondeu `No change found` para `sicoob-approval-reconciliation` (versão permaneceu 5), mas a confirmação exigia aumento de versão e marcou falso negativo. A PR #186 altera o verificador para aceitar versão igual, exigir função existente, versão inteira positiva e não regressiva; 4 testes unitários e simulação local passaram. Não reexecutei o deploy. CI da PR ainda está bloqueado por audit high da main e CodeQL antigo; sem deploy remoto.
* **Security Scan — [run 40602983158](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983158) e Qualidade contínua — [run 40602982964](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982964):** ambos bloqueados pelo audit high em `undici` e `zod`. Atualização segura do Undici e migração de compatibilidade Zod 4 permanecem em branch separada, com suíte completa exigida; não atualizar por `--force`.
* **CodeQL — [run 40602983073](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983073):** causa era mix de versões (init 4.39.1 vs autobuild/analyze 4.38.2); correção local preparada e aguarda CI.
* Workflows verdes vistos no inventário: Branch Protection Sentinel [40602983038](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983038), Enterprise Compliance [40602982958](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982958) e Portal Sicoob [39868499315](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39868499315).

## Validação local pós-commit

Após o quarto commit: build, lint (0 erros; 873 avisos existentes), lint baseline, typecheck, typecheck baseline e suíte completa passaram. Resultado: 454 arquivos de teste aprovados, 4 condicionais pulados; 5.855 testes aprovados, 68 condicionais pulados. A primeira execução pós-commit apresentou exceção assíncrona jsdom/Radix em `admin-ref-warning-guard`; a repetição integral passou sem alterar nem enfraquecer o teste. `npm audit` continua bloqueado pelos 2 findings high já descritos.

## Atualização de auditoria dos PRs — 2026-10-31

### PR #185: E2E remoto não pode ser repetido até comprovação do destino

O run [41183325196](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41183325196) falhou no `beforeAll` de `tests/rls/e2e-cleanup-rate-limit.test.ts`, com timeout de 45 s ao inserir uma linha-canário em `public.e2e_cleanup_rate_limit`. O teste usa `SUPABASE_SERVICE_ROLE_KEY`, tenta apagar a canary no `afterAll` e também executa operações anon de insert/update/delete.

Na versão do workflow da `main` usada por esse PR, as secrets genéricas `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID` e `SUPABASE_SERVICE_ROLE_KEY` são entregues ao job de PR sem `environment: e2e-qa` ou allowlist. Não é possível comprovar pelo GitHub qual projeto essas secrets apontaram nem se a requisição de insert foi efetivada antes do timeout. Não afirmo que o banco ficou intacto. A conexão MCP de leitura ao Supabase canônico expirou duas vezes; nenhum SQL foi executado por esta auditoria.

**Ação do owner:** identificar em privado o destino configurado nas secrets utilizadas no run; se era o projeto QA autorizado, inspecionar nele a canary criada no horário do run e removê-la apenas se confirmada como fixture órfã. Se o destino era um projeto canônico, avaliar o impacto e a rotação das secrets de acordo com a política da organização. Não publicar valores de secrets. **Não rerodar E2E remoto** até que a proteção da PR #184 esteja na árvore do workflow e o destino QA seja comprovado.

A PR #184 introduz a proteção: PRs usam placeholders sem secrets e executam apenas jornadas públicas; testes remotos autenticados ficam em `workflow_dispatch` com environment `e2e-qa`, allowlist de projeto e bloqueio dos projetos canônicos. O E2E duplicado da PR #186 [41184349669](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41184349669) foi cancelado para evitar nova tentativa de escrita com destino não comprovado.

### Outros checks remotos ainda bloqueados

- A simulação PostgreSQL da PR #185 falhou inicialmente no run [41183325186](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41183325186) porque o ECR respondeu `toomanyrequests: Data limit exceeded` ao baixar `public.ecr.aws/supabase/postgres:17.6.1.063`. Rerun apenas dos jobs falhos terminou **success** na tentativa 2. O container usa `--network none`; não é uma chamada Supabase.
- Na PR #185, `npm audit` e CodeQL passaram; E2E falhou pelo timeout acima. Copilot continua bloqueado por HTTP 402/quota ([run 41183332482](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41183332482)).
- Na PR #186, `npm audit` ainda encontra `undici` e `zod` high porque a branch parte da `main` sem a correção da PR #185 ([run 41184349697](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41184349697)). CodeQL também herdou o desalinhamento 4.39.1/4.38.2 ([run 41184349695](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41184349695)); o fix está nas PRs #184/#185, não nesta branch. Copilot falhou por quota ([run 41184357641](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41184357641)).
- Não mesclar PRs com checks falhos/pendentes. Não houve escrita manual ao banco canônico; permanece sem comprovação se o workflow remoto da PR #185 teve efeito parcial, conforme descrito acima.

### Checks dinâmicos fora do inventário de workflows de produto

- O run Copilot dinâmico na branch de referência `main` [39785094125](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39785094125) falhou por quota HTTP 402; a execução atual na PR #185 também falhou pela mesma quota ([41183332482](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41183332482)). Ação do owner: liberar/aguardar cota do Copilot.
- O run dinâmico de Dependabot para `@vitest/mocker` [39775463512](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39775463512) falhou com `security_update_not_possible`; os updates posteriores de `undici` e Zod reportados na main foram `success` ([40603001428](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40603001428), [40603001197](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40603001197)). Sem PR aberta reproduzível para esse run antigo, manter como histórico, não como bloqueio atual dos cinco workflows de produto listados.

## Situação atual após correções locais — 2026-10-31

- Os commits de correção de `undici` e Zod 4 (`a96fd44ca`, `46e6cc33c`) foram cherry-picked para a branch da PR #184. `npm audit` local terminou sem vulnerabilidades; build, typecheck e suíte completa passaram. A correção ainda **não está na main** e os checks remotos do novo SHA ainda precisam concluir.
- A consulta de environments do GitHub confirmou que `e2e-qa` ainda não existe (404). Existe `e2e-staging`, mas sem regras de proteção ou política de branches. Ele não atende ao isolamento exigido e não será usado como destino remoto. O owner informou que vai configurar o projeto QA; até isso ser confirmado, testes E2E autenticados permanecem bloqueados.
- Nenhum valor de secret foi lido ou registrado. Não houve chamada de escrita ao Supabase nem execução de migration/deploy.
- Os commits estão publicados na PR #184. Os cinco workflows ainda constam como falha na última execução da `main` do inventário de 2026-10-31; só novas execuções na `main` poderão confirmar a resolução.

> **Correção de status:** a cota do ECR foi recuperada; a execução posterior no SHA `640944d97` passou, conforme abaixo. O bloqueio atual é de revisão/merge, não de ECR.

### Falha intermitente de infraestrutura na PR #184 — ECR

O run [41188633657](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41188633657), no SHA `c1c0a6e30fb1be755aee9b30fec5835600514cc7`, falhou apenas em **“Simular controles de auditoria e permissões em PostgreSQL descartável”**. O pull de `public.ecr.aws/supabase/postgres:17.6.1.063` respondeu `toomanyrequests: Data limit exceeded` após três retentativas internas. O rerun somente do job (tentativa 2) repetiu a causa. Posteriormente, o SHA `640944d97f8ee3da1c66fa40247b1397d2809474` executou novamente o workflow [41190013312](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41190013312) e todas as simulações, inclusive a mesma etapa PostgreSQL, terminaram **success**. O limite do ECR foi transitório e não é bloqueio atual da PR.

O problema voltou no SHA `f4014641d`: [run 41191870511](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41191870511) falhou na mesma etapa e o rerun isolado (tentativa 2) repetiu o `toomanyrequests: Data limit exceeded`. Reapareceu também no SHA `123482fde`: [run 41193290224](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41193290224), etapa idêntica, após três tentativas internas. A execução no SHA `640944d97` passou em todas as simulações, provando a natureza intermitente do registry. Nenhuma conexão ao Supabase foi feita por esses jobs: o container da simulação é descartável e usa `--network none`. Não farei reruns idênticos enquanto o limite persistir; se necessário, o owner deve aguardar a recuperação da cota ou configurar uma origem de imagem autenticada e aprovada.

**Estado atual:** no SHA `9e9e15cca`, a execução [41194181710](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41194181710) terminou **success**, incluindo a etapa que havia falhado. O rate limit do ECR não bloqueia o SHA atual; as falhas acima permanecem como histórico de intermitência.

### Merge da PR #184 aguardando janela de deploy

A branch altera dependências de runtime: `zod` 3 → 4 e `@hookform/resolvers` 3 → 5. Os testes e checks verificam a compatibilidade, mas a mudança afeta o artefato da aplicação. Como a instrução de CI vigente determina não mesclar PR que possa disparar deploy de produção quando alterar código/dependências da aplicação, a PR permanece aberta e pronta para revisão; não mesclar até o owner autorizar uma janela apropriada para esse deploy. Sem merge, as correções ainda não estão na `main` e os workflows desta lista não podem ser declarados resolvidos na branch principal.

Na execução mais recente observada da PR [#184](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/184), SHA `9e9e15cca`, todos os checks de produto terminaram success: E2E público [41194181693](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41194181693), qualidade/simulações/build [41194181710](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41194181710), responsividade, simulação transacional e origem confiável [41194181700](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41194181700), CodeQL [41194181698](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41194181698), bundle [41194181714](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41194181714), Lighthouse [41194181722](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41194181722), npm audit e Gitleaks [41194181692](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41194181692). O E2E autenticado e os shards dependentes ficaram skipped porque o ambiente `e2e-qa` continua ausente; o Vercel Agent Review foi neutral por billing desabilitado. A jornada autenticada permanece sem prova até a configuração do projeto isolado e secrets de QA pelo owner.

**Check auxiliar do Copilot na PR:** o check [41194779827](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41194779827/job/124518649729) terminou failure em `Processing Request (Linux)`. A anotação disponível informa somente `Process completed with exit code 1`; o trecho de log acessível não revela causa acionável. É uma integração de revisão auxiliar, não um check de produto. Sem causa identificável, não há correção segura a aplicar no repositório; requer diagnóstico do provedor/owner. Os checks de produto no SHA `9e9e15cca` permanecem verdes conforme a lista acima.
