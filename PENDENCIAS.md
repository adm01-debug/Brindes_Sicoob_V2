# Pendências de CI — adm01-debug/Brindes_Sicoob_V2

Atualizado em: 2026-10-28

Cada seção abaixo descreve um workflow que falha por motivo externo ao código do repositório.
O erro exato foi extraído do run mais recente disponível em main.

---

## Atualização 2026-10-28 — auditoria de sincronização e CI

**SHA remoto auditado:** `e9d59026793b84fabeaeec9da890a068f64d49c3` (`main`).

**Banco canônico:** `cfmzkthhgliqelozlmwu`, consulta somente leitura.

**Cópia local original:** `main` em `6b71bdc`, 84 commits atrás, com alterações locais não commitadas preservadas.

### Workflows que estavam vermelhos na última execução da main

| Workflow | Última execução | Causa reproduzida | Correção preparada |
|---|---|---|---|
| Security Scan | [40602983158](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983158) | `npm audit --audit-level=high`: `undici` e `zod` altos. | Commit local da branch `e3e97e78b`: `undici@8.12.3`, Zod `4.6.7` com imports compatíveis `zod/v3`; `npm run check:npm-audit` passa. |
| Qualidade contínua | [40602982964](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982964) | A etapa de dependências/autorização executa `check:npm-audit`, que reproduz a mesma falha de `undici` e `zod`. | Mesmo commit `e3e97e78b`; `check-edge-authorization.mjs` e `check:seller-scope` não apresentaram falha local. |
| CodeQL | [40602983073](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983073) | `init` carregava `4.39.1`, enquanto `autobuild`/`analyze` ainda estavam em `4.38.2`; o Autobuild abortou e, como consequência, não produziu SARIF para upload de artefato. | Commit local da branch `bbd1047a2`: alinhar as três ações no SHA oficial de `v4.39.1`. |

Essas correções ainda não estão em `main`: aguardam publicação da branch/PR e checks remotos. **Não fazer merge automático**: o repositório publica o portal em `https://brindes-sicoob-v2.vercel.app`, e as mudanças de dependência alteram o bundle da aplicação. A decisão de implantação deve ocorrer após os checks do PR e a revisão do efeito no ambiente.

### Estado do banco e migrations

- Consulta somente leitura ao ledger: **137 registros**, mais recente `20261022230000` (`repair_migration_ledger_and_harden_search_path`).
- A execução remota de [Migration ledger drift #50](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40670784182), no mesmo SHA `e9d5902`, passou nas comparações de ledger e auditoria RLS.
- Resultado explícito da baseline: **0 divergências novas, 1 divergência histórica resolvida, 0 resoluções inválidas**.
- Não aplicar migration nesta auditoria: não foi identificado delta versionado pendente de aplicação.

### Alterações somente locais que não foram copiadas para a branch

- `secretNormalizers.ts`: a proteção do grupo de captura (`m[1] ?? s`) já consta no código remoto; nenhuma importação necessária.
- `health-check`: o rascunho local responde somente a GET e `{status:"ok"}`, mas `scripts/healthcheck.mjs` e `scripts/load-test.mjs` ainda chamam POST; importar como está quebraria consumidores existentes.
- `bi-share-dossier`: a alteração local exige `BI_SHARE_SECRET` próprio e remove a chave de serviço como fallback. A presença do secret e a existência de tokens antigos não puderam ser verificadas via MCP disponível; não publicar nem mesclar até confirmar provisionamento e estratégia de compatibilidade.
- `ChurnRiskBanner`, arquivos `supabase/.temp`, contratos/testes locais, `AUDITORIA.md`, `PLANO_100.md` e histórico Graphify: não foram importados; incluem refatoração não necessária, artefatos locais ou documentos que precisam de revisão de atualidade e fonte antes de se tornarem documentação canônica.

### Situação do PR #148 e bloqueios externos

- PR aberto: [#148](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/148), branch `fix/hermes-docs-all-20261028`; SHA auditado `33e185aa1973c5a0704877b3202727dd187aec34`.
- Em 2026-10-28 21:15 UTC, o E2E [run 40767773387](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40767773387) passou no smoke autenticado e seguia executando o gate de cabeçalho fixo; ainda não há conclusão final.
- Qualidade contínua [run 40767773135](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40767773135), Security Scan [run 40767774037](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40767774037), CodeQL [run 40767773643](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40767773643), Bundle Size [run 40767773213](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40767773213) e Lighthouse [run 40767773356](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40767773356) concluíram com sucesso.
- A execução anterior do job de Qualidade contínua (`40764336935`, tentativa 2) falhou na simulação PostgreSQL porque o ECR Public respondeu `toomanyrequests: Data limit exceeded` ao baixar `public.ecr.aws/supabase/postgres:17.6.1.063`. A execução posterior `40767773135` passou; a causa foi transitória e não consta como pendência atual.
- O check `copilot-pull-request-reviewer` falhou novamente no run [40767789155](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40767789155) com HTTP 402 por limite adicional de uso do Copilot. Ação necessária: verificar cota/plano em [GitHub Copilot Features](https://github.com/settings/copilot/features) ou aguardar a renovação da cota; depois solicitar nova execução do check.
- Não houve merge: os checks do PR não estão todos verdes e a atualização de dependências afeta o bundle da aplicação ligado ao Vercel. Não promover para `main` até resolver os bloqueios e cumprir o fluxo de CI/deploy.
- Banco: consulta somente leitura confirmou 137 entradas no ledger até `20261022230000` e presença/nome corretos das 27 migrations autorizadas pelo script `apply-sicoob-migrations.mjs`. O PR #148 não altera migrations. Nenhuma escrita ou migration foi executada nesta verificação.
- BI/health-check e demais alterações apenas locais permanecem fora do PR conforme os riscos de contrato e secret descritos acima.

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
