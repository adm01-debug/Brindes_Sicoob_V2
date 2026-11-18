# Pendências de CI — adm01-debug/Brindes_Sicoob_V2
# Pendências de CI — adm01-debug/Brindes_Sicoob_V2

Atualizado em: 2026-10-30

> **Recuperação de trabalho fora da `main` (18/11/2026):** o ledger com o veredito de cada
> branch e de cada PR fechada sem merge, e os 122 itens a recuperar, está em
> [`docs/RECUPERACAO/README.md`](docs/RECUPERACAO/README.md). **Nenhuma branch ou PR é
> apagada sem veredito escrito lá.**

Cada seção abaixo descreve um workflow que falha por motivo externo ao código do repositório.
O erro exato foi extraído do run mais recente disponível em main.

> **Rechecagem atual (2026-10-30):** as seções antigas deste arquivo registram o
> histórico de 22/10. Abaixo está o inventário mais recente confirmado no GitHub
> MCP; ele prevalece quando houver conflito com o histórico.

## Inventário atual de workflows e configuração pendente (2026-10-30)

| Workflow / item | Evidência mais recente | Situação e causa confirmada |
|---|---|---|
| Qualidade contínua | [run 40602982964](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982964) | `failure` na `main`; auditoria de dependências aponta `undici` e `zod` com vulnerabilidades high. |
| Security Scan | [run 40602983158](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983158) | `failure` na `main`; mesma causa de dependências high (`undici` e `zod`). |
| CodeQL | [run 40602983073](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983073) | `failure` na `main`; configuração `4.39.1` diverge da versão efetiva `4.38.2`, sem SARIF. A correção está no PR #164, ainda aberto. |
| Publicar funções Sicoob | [run 40772348102](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40772348102) | `failure` na `main`; pull da imagem Docker Hub bloqueado por `toomanyrequests: Data limit exceeded`; verificação também observou `sicoob-approval-reconciliation` ainda na versão 5. |
| Running Copilot Code Review | [run 39785094125](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39785094125) | `failure`; quota adicional do GitHub Copilot retornou HTTP 402 (`SessionModelError`). |
| Migration ledger drift | [run 41013281253](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41013281253) | `success` em 30/10/2026. |
| Enterprise Compliance & Audit Reporting | [run 40602982958](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982958) | `success` no SHA atual de `main` (`e9d59026793b84fabeaeec9da890a068f64d49c3`). |
| E2E do PR #164 | [run 40950721820](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40950721820) | `failure` antes da jornada: configuração do projeto Supabase E2E isolado ausente. A variável e os secrets E2E dedicados não estão configurados no repositório. O PR #164 continua aberto e bloqueado. |

### Ação do owner para liberar E2E isolado

Configurar no GitHub Actions, sem compartilhar os valores na conversa:

- variável `E2E_SUPABASE_PROJECT_ID` com o project ref do Supabase de homologação;
- secrets `E2E_SUPABASE_URL`, `E2E_SUPABASE_PUBLISHABLE_KEY` e
  `E2E_SUPABASE_SERVICE_ROLE_KEY` do mesmo projeto isolado.

O inventário de nomes confirma que esses quatro itens ainda faltam; as credenciais
de usuário E2E existem. A validação do workflow impede usar os projetos protegidos
de produtos e do portal como destino de testes.

### Configuração da nova correção de webhook

A migration `20261029213000_secure_webhook_dispatcher_callers.sql`, no candidato
`fix/webhook-dispatch-auth-311333`, ainda não foi aplicada. Antes de qualquer
aplicação no ambiente autorizado, provisionar no ambiente de homologação o mesmo
segredo aleatório de 32–512 caracteres como secret `WEBHOOK_DISPATCHER_SECRET`
da Edge Function e como `webhook_dispatcher_secret` no Supabase Vault. Sem ambos,
os chamadores falham fechados. A simulação local não comprova entrega externa nem
configuração remota; nenhum banco remoto foi alterado. Claims ficam em tabela
separada de `webhook_deliveries`, sem afetar métricas, e são removidos pelo job
de limpeza existente após 90 dias. A simulação valida essa retenção; a entrega
Edge ponta a ponta e ACK durável continuam sem comprovação. A lease de 15 minutos
limita duplicidade, mas não consulta o estado interno de `pg_net`; se uma execução
continuar pendente além da lease, a próxima tentativa pode se sobrepor. O contrato
é at-least-once, não exactly-once, e esse risco precisa de teste/monitoramento em
homologação antes de habilitar retry contínuo.

### Checks da PR #173 (observação em 2026-10-30, 11:10 UTC)

A PR [#173](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/173), no SHA
`977994fb5de3d3c0c4617496f0347b29e2053bd8`, permanece aberta e não foi mergeada.
Os resultados abaixo são do SHA anterior ao ajuste local de claim/concorrência e
precisam ser rechecados no commit seguinte da mesma PR.
O CodeQL falhou no [run 41045149603](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41045149603)
pela divergência entre a action configurada (4.39.1) e a executada (4.38.2), seguida
da ausência de SARIF; a mesma causa já consta no inventário da `main`. O ajuste
proposto no PR #164 ainda não faz parte deste SHA.

| Workflow | Run | Resultado observado |
|---|---:|---|
| CodeQL | [41045149603](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41045149603) | Falha: action configurada 4.39.1, efetiva 4.38.2, sem SARIF. |
| Qualidade contínua | [41045149542](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41045149542) | Falha: `undici` e `zod` high no `npm audit`. |
| Security Scan | [41045149525](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41045149525) | Falha pelo mesmo `npm audit`; Gitleaks passou. |
| Running Copilot Code Review | [41045168591](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41045168591) | Falha externa: HTTP 402 por limite adicional do Copilot. |
| Bundle Size Check | [41045149500](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41045149500) | `success`. |
| Lighthouse Performance Audit | [41045149507](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41045149507) | `success`. |
| Portal Sicoob | [41045149586](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41045149586) | `success`. |
| E2E (Playwright) | [41045149524](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41045149524) | Ainda em execução às 11:10 UTC; não inferir resultado. |

Vercel Preview Comments passou. Devin Review foi `success` apenas por review
ignorado (trial/créditos esgotados), portanto não é aprovação substantiva. Não
fazer merge enquanto houver checks obrigatórios pendentes ou falhos.
# Pendências de CI — adm01-debug/Brindes_Sicoob_V2

## Atualização de 2026-10-31 — estado observado na `main`

Este bloco registra apenas a verificação nova desta data. O inventário histórico abaixo foi preservado e não deve ser interpretado como estado atual sem consultar os links dos runs.

### E2E: ambiente de homologação e guarda de destino

- **Bloqueio:** o workflow ainda injeta credenciais e o token de cleanup em PRs; `globalSetup`, `globalTeardown` e a fixture de falhas podem chamar a limpeza remota. O destino é resolvido de `VITE_SUPABASE_URL`/`SUPABASE_URL` sem conferir o project ref.
- **Configuração observada:** não há secrets de escopo de repositório chamados `E2E_SUPABASE_URL`, `E2E_SUPABASE_PUBLISHABLE_KEY`, `E2E_SUPABASE_PROJECT_ID` e `E2E_SUPABASE_SERVICE_ROLE_KEY`. O conector não permite inspecionar secrets de environments; portanto a ausência global não está comprovada.
- **Run mais recente observado na `main`:** [E2E Playwright — run 37775702358](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/37775702358), `startup_failure`, SHA `a974d77` (08/10/2026). Logs expirados; causa exata indisponível.
- **Próxima ação:** provisionar projeto Supabase de QA, configurar URL, publishable key, project ref e service-role key exclusivos nesse environment, criar allowlist não secreta do project ref e configurar required reviewers. Até a validação, não disparar a jornada autenticada.

### Migration ledger drift: causa não identificada com evidência suficiente

- **Run:** [Migration ledger drift — run 41175713780](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41175713780), attempt 2, SHA `e9d5902`, 31/10/2026.
- **Step:** “Comparar ledger remoto contra arquivos locais”.
- **Saída observada:** `[ledger] Verificação indisponível (Error); nenhum resultado aprovado.` Exit code 2. A auditoria de RLS do mesmo run passou.
- **Bloqueio:** o workflow não fornece a causa original além do tipo `Error`, e o MCP Supabase retornou timeout `Management API 544` ao consultar a conexão. Não assumir divergência nem registrar migration como aplicada.
- **Próxima ação:** recuperar uma conexão somente leitura, repetir a consulta de ledger com erro sanitizado e comparar hashes/versões; não usar operação de escrita.

### Publicação de Edge Functions — confirmação do alvo necessária

- **Run:** [Publicar funções Sicoob — run 40772348102](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40772348102), SHA `e9d5902`, 28/10/2026.
- **Falha:** verificação pós-publicação constatou `sicoob-approval-reconciliation` na versão 5, igual à versão anterior esperada pelo workflow, sem confirmação da versão da nova fonte.
- **Próxima ação:** primeiro confirmar o projeto de construção autorizado e comparar versão remota com manifesto Git. Não repetir deploy enquanto alvo/resultado não estiverem identificados.

### Dependências e scanners

- **npm audit local:** 17 achados (15 moderados, 2 altos). `undici` tem correção de patch disponível; `zod` requer Zod 4 (major). Não usar `npm audit fix --force` nem atualizar major sem revisão de compatibilidade e migração por causa raiz.
- **Runs no SHA `e9d5902`:** [Qualidade contínua 40602982964](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982964), [Security Scan 40602983158](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983158) e [CodeQL 40602983073](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983073) falharam. Reexecutar após correções e analisar os trechos de falha do SHA atual.

### Observabilidade histórica

- Lighthouse [run 36353765910](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/36353765910) e Bundle Size [run 36353765911](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/36353765911) falharam no SHA antigo `99dd877`; logs expirados. Como são acionados por PR, o próximo PR com código deve ser usado para obter resultado atual e evidência recuperável.
- A ferramenta Supabase MCP falhou com timeout 544 na consulta somente leitura. Nenhuma alteração foi feita no banco canônico.

Atualizado em: 2026-10-22

Cada seção abaixo descreve um workflow que falha por motivo externo ao código do repositório.
O erro exato foi extraído do run mais recente disponível em main.

---

~~## Workflow: `npm_and_yarn` — Dependabot `@vitest/mocker` Update~~

> ✅ **RESOLVIDO em 2026-10-22** — `vitest` e todos `@vitest/*` atualizados para 4.1.12 no commit `b32e5e4`. CVEs GHSA-qxg6-89mg-rqv8 e GHSA-xp26-3454-mjgp corrigidas.

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
ðŸ›‘ Fail-fast se smoke falhou (gate)
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

**Run mais recente observado:** [40795427376](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40795427376) Â· PR #152
**Erro exato:**

```
SessionModelError: You've reached your additional usage limit for your plan.
Go to https://github.com/settings/copilot/features for more details.
(Request ID: 902B:218FBF:B4B372B:BEBD93B:6AE295C1)
errorCode: 'quota', statusCode: 402
```

**Causa raiz:** Quota mensal do GitHub Copilot esgotada.

**O que você precisa fazer:**

1. Acesse `github.com/settings/billing` e verifique o uso do Copilot.
2. Atualize o plano ou aguarde o reset do ciclo de faturamento.

---

## Workflow: `lighthouse` (Lighthouse Performance Audit)

**Trigger:** `on: pull_request` com `paths-ignore: ['docs/**', '*.md', '.github/CODEOWNERS']` — **não dispara em push à main**.  
**Run mais recente disponível:** `36353765910` Â· Job `108717316857` Â· SHA `99dd8778` Â· 2026-09-27  
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
**Run mais recente disponível em main:** `36353765911` Â· Job `108717316864` Â· SHA `99dd8778` Â· 2026-09-27  
**Log:** expirado (HTTP 404).  
**Estado em PR #136:** **success** ✅ Â· Run `39787553405` Â· Job `119854596437`.

**Causa da falha de Set/27:** Logs indisponíveis. Possível causa: script `scripts/qa/check-bundle-budget.mjs` com limite de orçamento ultrapassado no código daquele PR.  
**Estado atual:** Não é um bloqueio — no código atual (PR #136) o check PASSOU.

---

## Workflow: `Aplicar migrations Sicoob` (`apply-sicoob-migrations.yml`)

**Trigger:** `workflow_dispatch` apenas (manual) — requer input `confirmar: "APLICAR"` e branch `main`.  
**Não há runs automáticos.** Workflow só executa quando o owner aciona manualmente via GitHub UI ou API.  
**Último run:** não disponível (nenhum run automático indexado em `branch=main`).  
**Ação necessária:** Nenhuma no momento — workflow é utilitário para aplicar migrations ao banco de construçãoo sob demanda.

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
**Runs:** `39850827027` Â· `39852468612`
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

A migration `20261022120000_add_public_favorites_to_security_definer_allowlist.sql` foi aplicada ao banco fora do Supabase CLI (via Management API), portanto nunca foi registrada em `supabase_migrations.schema_migrations`. O schema estava correto, mas o ledger do Supabase ficou dessincronizado. Inserçãoo de reparo realizada no commit acima.

### Gap 2 — MÉDIO: `e2e_cleanup_check_rate_limit` com `search_path` incompleto

**Status:** ✅ RESOLVIDO — migration de reparo aplicada no mesmo commit.

A funçãoo SECURITY DEFINER `e2e_cleanup_check_rate_limit` tinha `SET search_path TO 'public'` sem o `pg_catalog` explicitamente como primeiro elemento, diferentemente das outras funções SECURITY DEFINER do projeto (`get_public_favorite_list` e `get_public_favorite_reactions`). Corrigido para `pg_catalog, public` por consistência com o padrão de hardening do projeto.

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

| Workflow | Causa | Correçãoo | PR |
|---|---|---|---|
| Branch Protection Sentinel | Squash merge com mensagem customizada sem `(#NNN)` | PR mergeado sem `commit_message` custom (GitHub gera título com `(#NNN)`) | #128 |
| Enterprise Compliance — Security Definer ACL | `audit_security_definer_acl()` sem `get_public_favorite_list` e `get_public_favorite_reactions` | Migration `20261022120000_add_public_favorites_to_security_definer_allowlist.sql` | #126 |
| Migration Ledger Drift | Fingerprint de `20261022120000` calculado com `local_sha256` incorreto; novo digest correto: `e2815b0...` | Corrigido fingerprint no `migration-ledger-baseline.json` | #129 |
| 5 CVEs high (vite â‰¤6.4.3) | GHSA-698v, GHSA-r825, GHSA-587h, GHSA-9jrq, GHSA-rq7h | `vite` 6.4.3 → 6.4.5 | #126 |
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

## Validação pendente: proteçãoo dos dispatches com credenciais Supabase

Revisão transversal encontrou jobs que recebiam credenciais privilegiadas durante `workflow_dispatch` em branches arbitrárias: compliance, auditoria de performance e migration-ledger drift. Os três agora restringem o disparo manual à `main`; os workflows de aplicação de migrations e deploy de Edge Functions já tinham essa proteçãoo. `actionlint` e os gates locais serão repetidos; só o CI de PR poderá validar a mudança de forma remota. Em `migration-ledger-drift.yml`, confirmar também que o environment `construction` mantém política de branches restrita à `main`.

O workflow Lighthouse também recebeu correção: o token da GitHub App foi removido porque o destino do upload é `filesystem`, e `continue-on-error` foi eliminado. O CI deve confirmar que o upload de artefatos e as asserções seguem verdes.

Foram removidos ainda os `continue-on-error` restantes em `sicoob-ci.yml` e `bundle-check.yml`. O CI precisa confirmar publicação de artefatos sem supressão de falhas.

O CodeQL também foi corrigido localmente ao alinhar `init`, `autobuild` e `analyze` no release 4.39.1. O run da `main` falhou antes de gerar SARIF por incompatibilidade 4.39.1/4.38.2; confirmar geração e validação de SARIF no PR.

## Falhas atuais da última execução da `main` — inventário 2026-10-31

* **Migration ledger drift — [run 41175713780](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41175713780):** step 6 terminou com exit 2 e `[ledger] Verificação indisponível (Error); nenhum resultado aprovado.`. O step 7 (auditoria RLS) completou sem findings. A causa exata não era confirmável porque o script ocultava `error.message`; agora a mensagem é exibida com Bearer/access/service/API keys redigidas, e o cenário unitário verifica essa redação. Não apliquei migrations nem executei SQL remoto. Próximo passo: validar diagnóstico numa execução posterior autorizada na main.
* **Publicar funções Sicoob — [run 40772348102](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40772348102):** o CLI respondeu `No change found` para `sicoob-approval-reconciliation` (versão permaneceu 5), mas a confirmação exigia aumento de versão e marcou falso negativo. A PR #186 altera o verificador para aceitar versão igual, exigir funçãoo existente, versão inteira positiva e não regressiva; 4 testes unitários e simulação local passaram. Não reexecutei o deploy. CI da PR ainda está bloqueado por audit high da main e CodeQL antigo; sem deploy remoto.
* **Security Scan — [run 40602983158](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983158) e Qualidade contínua — [run 40602982964](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982964):** ambos bloqueados pelo audit high em `undici` e `zod`. Atualização segura do Undici e migração de compatibilidade Zod 4 permanecem em branch separada, com suíte completa exigida; não atualizar por `--force`.
* **CodeQL — [run 40602983073](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983073):** causa era mix de versões (init 4.39.1 vs autobuild/analyze 4.38.2); correção local preparada e aguarda CI.
* Workflows verdes vistos no inventário: Branch Protection Sentinel [40602983038](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983038), Enterprise Compliance [40602982958](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982958) e Portal Sicoob [39868499315](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39868499315).

## Validação local pós-commit

Após o quarto commit: build, lint (0 erros; 873 avisos existentes), lint baseline, typecheck, typecheck baseline e suíte completa passaram. Resultado: 454 arquivos de teste aprovados, 4 condicionais pulados; 5.855 testes aprovados, 68 condicionais pulados. A primeira execução pós-commit apresentou exceçãoo assíncrona jsdom/Radix em `admin-ref-warning-guard`; a repetiçãoo integral passou sem alterar nem enfraquecer o teste. `npm audit` continua bloqueado pelos 2 findings high já descritos.

## Atualização de auditoria dos PRs — 2026-10-31

### PR #185: E2E remoto não pode ser repetido até comprovação do destino

O run [41183325196](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41183325196) falhou no `beforeAll` de `tests/rls/e2e-cleanup-rate-limit.test.ts`, com timeout de 45 s ao inserir uma linha-canário em `public.e2e_cleanup_rate_limit`. O teste usa `SUPABASE_SERVICE_ROLE_KEY`, tenta apagar a canary no `afterAll` e também executa operações anon de insert/update/delete.

Na versão do workflow da `main` usada por esse PR, as secrets genéricas `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID` e `SUPABASE_SERVICE_ROLE_KEY` são entregues ao job de PR sem `environment: e2e-qa` ou allowlist. Não é possível comprovar pelo GitHub qual projeto essas secrets apontaram nem se a requisiçãoo de insert foi efetivada antes do timeout. Não afirmo que o banco ficou intacto. A conexão MCP de leitura ao Supabase canônico expirou duas vezes; nenhum SQL foi executado por esta auditoria.

**Ação do owner:** identificar em privado o destino configurado nas secrets utilizadas no run; se era o projeto QA autorizado, inspecionar nele a canary criada no horário do run e removê-la apenas se confirmada como fixture órfã. Se o destino era um projeto canônico, avaliar o impacto e a rotação das secrets de acordo com a política da organização. Não publicar valores de secrets. **Não rerodar E2E remoto** até que a proteçãoo da PR #184 esteja na árvore do workflow e o destino QA seja comprovado.

A PR #184 introduz a proteçãoo: PRs usam placeholders sem secrets e executam apenas jornadas públicas; testes remotos autenticados ficam em `workflow_dispatch` com environment `e2e-qa`, allowlist de projeto e bloqueio dos projetos canônicos. O E2E duplicado da PR #186 [41184349669](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41184349669) foi cancelado para evitar nova tentativa de escrita com destino não comprovado.

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
- A consulta de environments do GitHub confirmou que `e2e-qa` ainda não existe (404). Existe `e2e-staging`, mas sem regras de proteçãoo ou política de branches. Ele não atende ao isolamento exigido e não será usado como destino remoto. O owner informou que vai configurar o projeto QA; até isso ser confirmado, testes E2E autenticados permanecem bloqueados.
- Nenhum valor de secret foi lido ou registrado. Não houve chamada de escrita ao Supabase nem execução de migration/deploy.
- Os commits estão publicados na PR #184. Os cinco workflows ainda constam como falha na última execução da `main` do inventário de 2026-10-31; só novas execuções na `main` poderão confirmar a resoluçãoo.

> **Correçãoo de status:** a cota do ECR foi recuperada; a execução posterior no SHA `640944d97` passou, conforme abaixo. O bloqueio atual é de revisão/merge, não de ECR.

### Falha intermitente de infraestrutura na PR #184 — ECR

O run [41188633657](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41188633657), no SHA `c1c0a6e30fb1be755aee9b30fec5835600514cc7`, falhou apenas em **“Simular controles de auditoria e permissões em PostgreSQL descartável”**. O pull de `public.ecr.aws/supabase/postgres:17.6.1.063` respondeu `toomanyrequests: Data limit exceeded` após três retentativas internas. O rerun somente do job (tentativa 2) repetiu a causa. Posteriormente, o SHA `640944d97f8ee3da1c66fa40247b1397d2809474` executou novamente o workflow [41190013312](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41190013312) e todas as simulações, inclusive a mesma etapa PostgreSQL, terminaram **success**. O limite do ECR foi transitório e não é bloqueio atual da PR.

O problema voltou no SHA `f4014641d`: [run 41191870511](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41191870511) falhou na mesma etapa e o rerun isolado (tentativa 2) repetiu o `toomanyrequests: Data limit exceeded`. Reapareceu também no SHA `123482fde`: [run 41193290224](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41193290224), etapa idêntica, após três tentativas internas. A execução no SHA `640944d97` passou em todas as simulações, provando a natureza intermitente do registry. Nenhuma conexão ao Supabase foi feita por esses jobs: o container da simulação é descartável e usa `--network none`. Não farei reruns idênticos enquanto o limite persistir; se necessário, o owner deve aguardar a recuperação da cota ou configurar uma origem de imagem autenticada e aprovada.

**Estado atual:** no SHA `9e9e15cca`, a execução [41194181710](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41194181710) terminou **success**, incluindo a etapa que havia falhado. O rate limit do ECR não bloqueia o SHA atual; as falhas acima permanecem como histórico de intermitência.

### Merge da PR #184 aguardando janela de deploy

A branch altera dependências de runtime: `zod` 3 → 4 e `@hookform/resolvers` 3 → 5. Os testes e checks verificam a compatibilidade, mas a mudança afeta o artefato da aplicação. Como a instruçãoo de CI vigente determina não mesclar PR que possa disparar deploy de produção quando alterar código/dependências da aplicação, a PR permanece aberta e pronta para revisão; não mesclar até o owner autorizar uma janela apropriada para esse deploy. Sem merge, as correções ainda não estão na `main` e os workflows desta lista não podem ser declarados resolvidos na branch principal.

Na execução mais recente observada da PR [#184](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/184), SHA `9e9e15cca`, todos os checks de produto terminaram success: E2E público [41194181693](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41194181693), qualidade/simulações/build [41194181710](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41194181710), responsividade, simulação transacional e origem confiável [41194181700](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41194181700), CodeQL [41194181698](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41194181698), bundle [41194181714](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41194181714), Lighthouse [41194181722](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41194181722), npm audit e Gitleaks [41194181692](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41194181692). O E2E autenticado e os shards dependentes ficaram skipped porque o ambiente `e2e-qa` continua ausente; o Vercel Agent Review foi neutral por billing desabilitado. A jornada autenticada permanece sem prova até a configuração do projeto isolado e secrets de QA pelo owner.

**Check auxiliar do Copilot na PR:** o check [41194779827](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41194779827/job/124518649729) terminou failure em `Processing Request (Linux)`. A anotação disponível informa somente `Process completed with exit code 1`; o trecho de log acessível não revela causa acionável. É uma integração de revisão auxiliar, não um check de produto. Sem causa identificável, não há correção segura a aplicar no repositório; requer diagnóstico do provedor/owner. Os checks de produto no SHA `9e9e15cca` permanecem verdes conforme a lista acima.

## Revalidação do estado — 2026-10-31 — PR #184, SHA `78eb93b02e88bb11d2767c13f7445850466afa75`

Esta atualização substitui afirmações de “estado atual” anteriores que ainda apontavam para o SHA `9e9e15cca`. As seções anteriores preservam o histórico das execuções e não devem ser interpretadas como situação atual.

- PR #184 segue aberta, sem merge, e depende de aprovação de review. Os checks de produto no SHA `78eb93b` passaram (qualidade/simulações/build, E2E público, audit/Gitleaks, CodeQL, gate transacional, responsividade, origem, bundle e Lighthouse). A jornada E2E autenticada e os shards foram **skipped**.
- A consulta ao GitHub confirmou que o environment protegido `e2e-qa` retorna 404 e não está configurado. O `e2e-staging` existente não tem proteçãoo/política adequada e não é substituto seguro. **Ação do owner:** criar projeto Supabase exclusivo de QA, environment `e2e-qa` com regras/revisores, secrets/variáveis e personas sintéticas; depois disso, executar os workflows autorizados e confirmar os jobs autenticados. Não registrar valores secretos.
- O check auxiliar Copilot Reviewer [41195466764](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41195466764) falhou por HTTP 402/quota do serviço. É bloqueio de billing/limite externo, não de produto. Vercel Agent Review está `neutral` por billing desabilitado.
- A `main` continua no SHA `e9d59026793b84fabeaeec9da890a068f64d49c3`. Ledger drift [41175713780](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41175713780), publicação de Edge Functions [40772348102](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40772348102), Security Scan [40602983158](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983158), Qualidade contínua [40602982964](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982964) e CodeQL [40602983073](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983073) são falhas da última execução da main observada; precisam de nova execução nela para confirmar resoluçãoo. Checks verdes de PR não contam como prova pós-merge.
- A correção de dependências em PR #184 removeu os findings altos de `undici`/`zod`: `npm run check:npm-audit` e o check remoto no SHA `78eb93b` passaram. As entradas acima que descrevem npm audit como bloqueio atual permanecem apenas como histórico do diagnóstico.
- A tela Gestão de Compras foi ajustada localmente para remover números operacionais fabricados e substituir a aprovação em lote inerte por links para a fila real e para o painel. O candidato passou build, lint/typecheck baseline, suíte completa (5.857 testes aprovados, 68 skipped) e cenários (227/227); duas verificações novas confirmam a ausência dos valores fictícios e os destinos de navegação. A alteração e seus testes ainda aguardam commit e novo CI remoto.
- Não houve execução de migration, alteração no Supabase, deploy remoto ou leitura/gravação de secrets.

**Próximo passo:** registrar e enviar a correção de Gestão de Compras e esta atualização documental na PR #184; repetir os gates locais após o commit, acompanhar o CI do novo SHA e manter bloqueadas a validação E2E autenticada e a resoluçãoo das falhas de `main` até haver QA isolado e merge autorizado.

## Estado posterior ao commit `4cca418c` — 2026-10-31

Esta seção substitui como estado atual os apontamentos anteriores que diziam que a correção de Gestão de Compras aguardava commit ou novo CI.

- **ECR — intermitência observada, sem bloqueio no SHA atual:** no run [41197769071](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41197769071), tentativa inicial e rerun (tentativa 2) não iniciaram a simulação PostgreSQL descartável: três pulls de `public.ecr.aws/supabase/postgres:17.6.1.063` falharam com `toomanyrequests: Data limit exceeded`. Porém, o workflow completo mais recente no SHA `e466ef7f7` passou pela mesma etapa em [41199507236](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41199507236). Tratar as ocorrências anteriores como histórico de throttling do registry; não há bloqueio ECR ativo no SHA atual. O container de simulação usa `--network none`; não altera Supabase.
- **E2E autenticado pendente:** a API GitHub não encontra o environment `e2e-qa` (404). O existente `e2e-staging` não tem proteçãoo adequada. Owner: criar projeto Supabase exclusivo para QA, proteger o environment, configurar variáveis/secrets e personas sintéticas, sem registrar valores secretos; depois, executar o dispatch autorizado.
- **Copilot Reviewer:** [run 41197777721](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41197777721) falhou por quota HTTP 402. Ação do owner: liberar/aguardar cota do serviço; não é falha de produto.
- **Review e janela de merge:** PR [#184](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/184) continua aberta e requer aprovação humana. A mudança inclui dependências runtime (`zod` 3→4 e `@hookform/resolvers` 3→5); aguardar janela autorizada antes de mesclar.
- **Falhas da `main` não resolvidas:** a última execução observada continua no SHA `e9d59026793b84fabeaeec9da890a068f64d49c3`. Ledger [41175713780](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41175713780), publicação Edge Functions [40772348102](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40772348102), Security Scan [40602983158](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983158), Qualidade contínua [40602982964](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982964) e CodeQL [40602983073](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983073) permanecem falhos até novos runs elegíveis na `main` terminarem em success.
- Localmente, o commit `4cca418c` passou build, lint/typecheck baseline, Vitest (5.857 passados, 68 skipped), cenários (227/227) e npm audit. Checks verdes de PR não provam resoluçãoo na `main`.

### PR #186 — bloqueios atualizados em `3838556b6`

- `npm audit` e o gate da Qualidade contínua falham porque a branch ainda parte da `main` com findings altos de `undici`/`zod`; a correção está na PR #184. Revalidar após atualização da base.
- CodeQL falhou no [run 41198505613](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41198505613): `Autobuild` não conseguiu produzir SARIF com as referências desalinhadas herdadas da base (4.39.1/4.38.2). A PR #184 inclui o alinhamento.
- **Atençãoo — E2E remoto, destino não comprovado:** o [run 41198505589](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41198505589) falhou no step `Validar autorização remota e RLS técnico`: timeout de 45 s no `beforeAll` de `e2e-cleanup-rate-limit`, timeouts de 15 s em UPDATE/DELETE anon e chamada a `system-healthcheck`. O workflow herdado pode ter tentado inserir uma canary; não é possível afirmar se houve efeito, nem qual projeto foi destino sem ver as secrets. **Não rerodar.** Ação do owner: verificar privadamente o projeto e a canary no período do run; não publicar credenciais. A PR #184 substitui essa execução de PR por testes sem secrets e reserva E2E remoto a `e2e-qa` allowlisted.
- Portal, Bundle e Lighthouse passaram ([41198505598](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41198505598), [41198505662](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41198505662), [41198505614](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41198505614)). Copilot falhou em [41198512274](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41198512274), mas o resumo não expõe causa acionável; depende de diagnóstico do provedor/owner.
- PR #186 segue aberta sem certificação remota completa; não mesclar até a base e todos os checks obrigatórios estarem verdes. Nenhum deploy foi feito.

### CI completo da PR #184 no SHA `e466ef7f7` — 2026-10-31

Todos os workflows de produto foram **success**: E2E público [41199507198](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41199507198), Security Scan [41199507206](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41199507206), Qualidade/simulações/build [41199507236](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41199507236), CodeQL [41199507174](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41199507174), Portal Sicoob [41199507176](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41199507176), Bundle [41199507187](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41199507187) e Lighthouse [41199507235](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41199507235). E2E autenticado/shards ficaram skipped porque `e2e-qa` não existe. Copilot [41199514763](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41199514763) falhou em `Processing Request (Linux)`; o resumo do provedor não informa causa acionável. Permanecem pendentes review humano e janela de deploy para mesclar #184; a ausência de QA autenticado também impede declarar certificação completa.

## Inventário atualizado — última execução por workflow na `main` (2026-10-31)

Este inventário substitui os snapshots antigos acima. Nenhuma migration, SQL, deploy de funçãoo ou escrita no banco canônico foi executada durante esta auditoria.

| Workflow | Última execução na `main` | Causa / evidência | Ação e estado |
|---|---|---|---|
| Migration ledger drift | [41175713780](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41175713780) — failure | Step 6: `[ledger] Verificação indisponível (Error); nenhum resultado aprovado.`. O log do run não contém a causa interna. | PR #184 inclui mensagem de erro sanitizada e teste local; aguarda nova execução autorizada na `main` para revelar a causa sem expor chaves. Nenhuma migration aplicada. |
| Publicar funções Sicoob | [40772348102](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40772348102) — failure | O CLI informou `No change found` para `sicoob-approval-reconciliation`; versão anterior e atual eram 5. O verificador exigia aumento de versão e gerou falso negativo após deploy sem alterações. | PR #186 exige funçãoo única e ativa, versão válida e sem regressão; 7 testes focais passaram localmente. O verificador atesta metadados, não o hash do bundle. Não reexecutei o deploy. |
| Security Scan | [40602983158](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983158) — failure | `npm audit` reportou `undici` e `zod` com severidade alta. | PR #185 atualiza `undici`/Zod e o check remoto `npm audit` no SHA `2edff699` passou; sem merge até a revisão/deploy seguro. Restam 15 findings moderados, sem gate high/critical. |
| Qualidade contínua | [40602982964](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982964) — failure | Mesmo gate `check:npm-audit`; parou com as duas CVEs altas. | Mesma causa e correção da PR #185; CI remoto do novo SHA ainda está em andamento. |
| CodeQL | [40602983073](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983073) — failure | `init` 4.39.1 versus `autobuild/analyze` 4.38.2; análise não gerou SARIF. | Correçãoo está na PR #184 e commit correspondente também foi incorporado à PR #185; nova análise remota está em andamento. |

**Verdes na última execução da `main`:** Branch Protection Sentinel [40602983038](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983038), Enterprise Compliance [40602982958](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982958) e Portal Sicoob [39868499315](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39868499315). Estes runs precedem os PRs em aberto.

## Bloqueios externos e validações que ainda faltam

- **E2E autenticado e RLS remoto:** confirmei que a API do GitHub retorna `404 Not Found` para o environment `e2e-qa`. O owner informou que configuraria o ambiente. Criar o environment protegido, projeto Supabase descartável, secrets/personas e variáveis descritas na seção anterior; depois executar `workflow_dispatch` na `main`. Não usar os projetos canônicos `cfmzkthhgliqelozlmwu` nem `doufsxqlfjyuvxuezpln`.
- **Revisão Copilot:** run da PR #185 [41183332482](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41183332482) falhou com `SessionModelError`, HTTP 402, `errorCode=quota` (“additional usage limit” do plano). Ação do owner: revisar a cota em `github.com/settings/copilot/features`; o check não pode ser corrigido por alteração de código.
- **Merge/deploy:** as PRs #184 e #185 incluem mudanças de configuração CI e/ou dependências/código de aplicação. Não mesclar se a política de produção for disparada pelo merge de alteração da aplicação; manter abertas até revisão do owner e janela segura. A PR #186 só corrige workflow manual e não foi executada contra o Supabase.

### Atualização dos checks remotos das PRs (2026-10-31)

- **PR #184:** `npm audit` e `Segurança, contratos e build` falharam na SHA `2accc783`; estes checks antecedem a correção de dependências da PR #185. CodeQL, E2E público, responsividade, verba/aprovação e demais checks reportados passaram; `e2e-authenticated` foi `skipped` conforme a proteçãoo de secrets em PRs. Evidência: runs [41181549625](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41181549625), [41181549634](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41181549634) e [41181549751](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41181549751).
- **PR #185, SHA `2edff699`:** `npm audit`, Gitleaks, origem confiável, verba/aprovação, Lighthouse, responsividade e bundle passaram. E2E, build/contratos e CodeQL ainda estavam `in_progress` na última consulta. Revisão Copilot falhou por quota [41183332482](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41183332482). Esses checks ainda não certificam a PR inteira.
- **PR #186, SHA `d721f3a2`:** só há Preview success, Agent Review neutral e Copilot failure por quota [41182966896](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41182966896); não há checks de CI da aplicação visíveis após a alteração de base para `main`. Portanto, a validação local registrada não equivale a CI remoto aprovado.
- **Decisão:** manter as três PRs abertas. Não fazer merge enquanto houver checks obrigatórios pendentes/falhos, enquanto o ambiente de QA não for validado e sem confirmar se o merge dispara deploy de produção. O banco Supabase canônico permaneceu somente leitura.
- **Validação posterior do worktree #186:** build, lint, lint baseline, typecheck e typecheck baseline passaram; suíte completa: 5.843 aprovados e 68 skipped. `npm run check:npm-audit` falhou por `undici` e `zod` high na base `main`; a correção está na PR #185 e não foi incorporada a esta branch. Não foram alterados os gates nem os testes.

### Atualização do verificador de Edge Functions — 2026-10-31

- A PR #186 foi endurecida em revisão local: o inventário exige exatamente uma entrada para cada uma das sete funções e estado `ACTIVE`; versões são validadas sem coerçãoo numérica frouxa. A comparação admite igualdade para tratar o `No change found` do CLI, exige não regressão e rejeita estado ou versão ausentes/inválidos. Um teste garante que o conjunto de funções do workflow permanece em paridade com o código do verificador.
- Testes focais atuais: **7/7 aprovados**; ESLint direcionado, `actionlint` e `git diff --check` sem erros. A checagem local não chamou o Supabase nem prova o conteúdo/hash efetivamente servido.
- O novo commit ainda precisa passar pelos checks remotos da PR #186. As falhas já registradas de audit/build/CodeQL/E2E pertencem a um SHA anterior e à base antiga; consultar os checks do head novo antes de decidir merge.
- Não houve dispatch do workflow, uso de token ou publicação de Edge Functions.
---

## Migration T031 — retry de status por usuário inativo

**Estado:** correção implementada e simulada localmente; sem aplicação remota.

**Motivo do bloqueio:** o ambiente Supabase isolado de construçãoo e seu project ref ainda não foram confirmados. O executor versionado está restrito ao ref `cfmzkthhgliqelozlmwu`, que não foi confirmado como projeto de construçãoo independente; portanto a migration `20261030210000_require_active_actor_for_quote_status_retry.sql` não foi adicionada à allowlist e não foi executada. Nenhuma migration, funçãoo ou dado remoto foi alterado.

**Próxima ação necessária:** confirmar o ref e as credenciais do projeto Supabase de homologação/construçãoo; revisar o diff da PR e os checks; somente então acrescentar a migration à allowlist restrita ao ref aprovado e executar preflight, aplicação e verificação de ledger/definiçãoo/ACL nesse projeto. Não usar o banco canônico nem o banco de produtos como fallback.

**Prova local:** PostgreSQL 17 descartável, rede desativada. O cenário reproduz o acesso indevido com o wrapper anterior e confirma que o novo wrapper nega com `42501` antes de chamar o núcleo; o retry de vendedor ativo segue autorizado. Ver `RELATORIO_CI.md`, seção “Baseline e correção T031”.
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
- **Paridade no Git:** 12 arquivos de migration ausentes da `main` estão presentes no PR #151. A alegação de que correspondem às 137 entradas do ledger remoto consta na descriçãoo da PR; não foi revalidada no banco nesta execução.
- **Achados de revisão:** (a) `20261016171500_secure_public_favorite_share_rpc.sql` revoga SELECT de `anon`, enquanto `PublicFavoriteListPage` consulta as tabelas diretamente, potencialmente quebrando links compartilhados; (b) `20261016173000_remove_redundant_pa_budget_select_policy.sql` remove política buyer sem prova de que a política consolidada preserva o acesso de `comprador_singular` a todos os orçamentos esperados.
- **Ação:** corrigir os contratos/coberturas no PR, validar replay e CI antes de merge. Não reaplicar migrations, executar `db reset` ou alterar o banco canônico para reconciliar este registro.

### 6. Webhooks — limite de memória e CI remoto do PR #180

- **PR:** [#180](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/180), SHA `266b21de7d994105fcbae0ba2ea2dce860e3fdda`.
- **Correçãoo local publicada:** ao truncar um chunk acima do limite, o helper usa `slice()` para guardar uma cópia do prefixo em buffer compacto, em vez de manter uma view do `ArrayBuffer` inteiro. `deno test` do helper (4/4), contrato Vitest (10/10), suíte completa (5.840/68), typecheck, lint, build, Deno check e actionlint passaram.
- **Bloqueios:** após o push, o CodeQL [41166888455](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41166888455) falhou em `Autobuild`: `Loaded a configuration file for version '4.39.1', but running version '4.38.2'`. O upload SARIF falhou por consequência. Na consulta de 31/10/2026, os outros seis workflows disparados neste SHA ainda estavam queued/pending; consultar novamente antes de fechar o item. O `npm run check:npm-audit` local continua detectando `undici` e `zod` altos, por não fazerem parte deste patch.

### 7. Banco canônico e deploy

Nenhuma escrita SQL, migration, alteração de configuração ou deploy do Supabase foi realizado nesta auditoria. As ações remotas acima permanecem limitadas a consulta de estado do GitHub.
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
**Prova local:** PostgreSQL 17 descartável, rede desativada. O cenário reproduz o acesso indevido com o wrapper anterior e confirma que o novo wrapper nega com `42501` antes de chamar o núcleo; o retry de vendedor ativo segue autorizado. Ver `RELATORIO_CI.md`, seção “Baseline e correção T031”.
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
