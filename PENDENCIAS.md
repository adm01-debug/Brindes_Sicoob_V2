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

## Histórico: `Segurança, contratos e build` (`ci.yml`) — ECR Rate Limit

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

**Estado daquele incidente:** a falha deixou de ocorrer em execuções posteriores na época. A recorrência em 30/10/2026 está registrada na atualização mais recente ao final deste arquivo; o lote atual troca os dois pulls para GHCR com digest verificado e ainda aguarda confirmação remota.

## Atualização supersedente — PR #178, SHA `145773579` (30/10/2026)

Esta seção substitui a pendência de confirmação do GHCR e atualiza o diagnóstico E2E registrada acima.

- **Qualidade contínua:** ✅ success no run [41139832598](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41139832598). O pull da imagem PostgreSQL GHCR fixada por digest e os dois simuladores passaram no runner do GitHub; a recorrência do ECR está corrigida para este SHA.
- **E2E Playwright:** ❌ run [41139832427](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41139832427), tentativa 2. Setup autenticado e smoke (39/39) passaram; o job falhou no gate `header-sticky` antes de executar a medição de sticky em todas as rotas afetadas. O teste expirou em `e2e/helpers/nav.ts:171` aguardando `[data-route-pending]` desprender (`permissions`), inclusive em rotas que depois exibiram catálogo ou página de acesso negado. As chamadas observadas de sessão, `user_roles` e `profiles` responderam em aproximadamente 100–233 ms; não há evidência de quota ou secret ausente.
- **Causa/limite:** o run não comprova regressão CSS do header. O helper esperava a conclusão do guard antes da spec poder observar `/login` ou `/403`; o snapshot final do caso de telemetria mostra acesso negado corretamente. A causa subjacente da transição lenta/inconsistente ainda precisa de confirmação no novo run.
- **Correção candidata local, ainda sem validação remota:** a spec `22-header-sticky` agora não aguarda o gate de permissões internas e continua exigindo header visível antes das asserções de posição/CSS. A mensagem fail-fast distingue falha de prontidão (`nav.ts`) de falha visual. O patch será considerado resolvido somente após as verificações locais e o CI no novo SHA.
- **Outros checks do SHA `145773579`:** Security Scan [41139832390](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41139832390), CodeQL [41139832435](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41139832435), Lighthouse [41139832355](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41139832355), Bundle Size [41139832444](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41139832444) e Portal Sicoob [41139832356](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41139832356) concluíram com sucesso.

Nenhuma alteração foi feita no Supabase ou em produção.

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
# Pendências identificadas nesta execução — 30/10/2026

- **Auditoria de dependências (snapshot anterior ao WIP Zod):** `undici` transitivo foi atualizado para `8.12.3` dentro da faixa compatível. O finding de Zod em `3.25.76` levou à migração local para `zod@4.6.7` e `@hookform/resolvers@5.9.2`, preservando os imports legados via `zod/v3`; instalação limpa e `npm run check:npm-audit` passaram. Compatibilidade local passou em TypeScript, lint, build e suíte completa. A confirmação remota ainda depende de commit, push e dos checks da PR #178 no novo SHA; até então, o finding não é considerado resolvido no GitHub.
- **CodeQL no PR #178:** a execução `41130837131` falhou porque `init` usava CodeQL Action v4.39.1 enquanto `autobuild`/`analyze` usavam v4.38.2; por isso não houve SARIF e o upload encadeado também falhou. Corrigido no commit `f7c257c0b`; a execução `41132174662` no SHA `d58c2b39a093244ec75bfc7e2371bb5bbb27553c` concluiu com sucesso. Deve ser confirmada novamente após o commit de escopo por vendedor.

### Migração Zod — PR #178 (30/10/2026)

- **Estado:** worktree local antes de commit/push, branch `fix/hermes-h393620-inteligencia-real`, base `095929978900f2939f32a1fc7fc31afdf6bc7804`.
- **Mudança:** `zod@4.6.7` e `@hookform/resolvers@5.9.2`; imports dos schemas existentes mantidos explicitamente em `zod/v3`. O formulário de produto declara o contrato de saída e documenta a fronteira do resolver; defaults completos, estado tipado e campos numéricos `valueAsNumber` mantêm o estado no tipo de saída.
- **Validação local:** `npm ci` e `npm run check:npm-audit` passaram com 0 vulnerabilidades; `npm test` passou com 5.850 testes, 68 ignorados e 0 falhas; `npm run typecheck`, `npm run lint` (0 erros, 874 avisos existentes), `npm run build` e `git diff --check` passaram.
- **Pendente:** registrar em commit e push pelo PR e aguardar Security Scan, Qualidade contínua e demais workflows no novo SHA. Não houve alteração no Supabase nem deploy.

## Atualização da PR #178 — commit `e7d770c` e falha recorrente do ECR (30/10/2026)

Esta seção substitui os estados pré-push registrados acima para a migração Zod. O commit `e7d770c28cbbc8824f0611e6c04bd434a2effeef` está publicado na branch `fix/hermes-h393620-inteligencia-real`, PR #178. A migração Zod passou pela instalação limpa, auditoria npm, typecheck, lint, build e suíte local.

| Workflow no SHA `e7d770c` | Última execução | Estado |
|---|---:|---|
| Security Scan | [41136504200](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41136504200) | ✅ success |
| CodeQL | [41136504217](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41136504217) | ✅ success |
| Lighthouse Performance Audit | [41136504186](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41136504186) | ✅ success |
| Bundle Size Check | [41136504296](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41136504296) | ✅ success |
| Portal Sicoob | [41136504216](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41136504216) | ✅ success |
| Qualidade contínua | [41136504246](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41136504246) | ❌ falha na tentativa 2 |
| E2E (Playwright) | [41136504176](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41136504176) | ⏳ em execução na última consulta |

### Causa e correção proposta para Qualidade contínua

As duas tentativas do run `41136504246` falharam no step “Simular controles de auditoria e permissões em PostgreSQL descartável” com `toomanyrequests: Data limit exceeded` ao baixar `public.ecr.aws/supabase/postgres:17.6.1.063`. A falha reproduz o limite de dados do ECR documentado historicamente acima.

O worktree troca somente o registry de origem para `ghcr.io/supabase/postgres:17.6.1.063` e fixa o índice OCI em `sha256:178f0976b54a39237096bfa310c1a352dbc82fb1b08dda45cdb8acb5d40c1426`. A comparação local de manifests confirmou que o índice GHCR e o índice ECR, incluindo o manifest linux/amd64, têm os mesmos digests. Os dois simuladores executaram localmente com sucesso usando essa referência. Fonte do pacote oficial: [supabase/postgres no GitHub Container Registry](https://github.com/supabase/postgres/pkgs/container/postgres).

**Estado:** correção ainda não publicada nem confirmada pelo GitHub Actions. O próximo passo é revisar, validar e publicar o lote em novo commit da PR #178; depois confirmar `conclusion=success` no workflow `Qualidade contínua`. Até esse run verde, esta pendência permanece aberta.

**Nenhuma alteração no Supabase ou deploy foi executada.**
