# Pendências de CI — adm01-debug/Brindes_Sicoob_V2

## Estado atual — 29/10/2026

Os itens de 22/10 abaixo são histórico e não representam o estado atual. Rechecagem dos últimos runs na `main`:

| Workflow | Run | Estado atual |
|---|---|---|
| `Security Scan` | [40602983158](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983158) | Falha por vulnerabilidades altas em `undici` e `zod`; correção em andamento na branch de CI. |
| `Qualidade contínua` | [40602982964](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982964) | Mesmo bloqueio do gate `npm audit`. |
| `CodeQL` | [40602983073](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983073) | Falha por mistura de versões: `init` 4.39.1, `autobuild/analyze` 4.38.2. |
| `Publicar funções Sicoob` | [40772348102](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40772348102) | As publicações terminaram; a verificação final falhou pois `sicoob-approval-reconciliation` ficou na versão 5 (antes 5) após a CLI registrar “No change found”. Não houve evidência de falha de credencial. |

**Workflows verdes na última execução consultada:** `Migration ledger drift` (dispatch manual), `Branch Protection Sentinel`, `Enterprise Compliance & Audit Reporting` e `Portal Sicoob`. A execução agendada anterior do ledger drift falhou, mas não é a mais recente.

**PRs ainda afetados:** #150, #151 e #156 têm checks de dependências/CodeQL falhando. No #156, a validação remota de autorização/RLS também apresentou timeout. A correção do CodeQL usa o SHA oficial 4.39.1 uniforme e aguarda confirmação na CI do PR. Nenhum desses PRs foi integrado à `main`.

### PR #157 — correções de CI em validação

PR: [#157](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/157), branch `fix/hermes-h247355-ci-dependencies`, commit `b4ce6a097e51c64bcc4f70fa7940dc93f3ffee28`.

| Check no PR | Resultado | Evidência / pendência |
|---|---|---|
| npm audit | ✅ success | [Run 40818618209](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40818618209); zero vulnerabilidades no candidato. |
| CodeQL | ✅ success | [Run 40818618134](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40818618134); SHA único v4.39.1. |
| Gitleaks, origem confiável, bundle, Lighthouse, verba/aprovação, entrada responsiva e Vercel Preview Comments | ✅ success | Checks do SHA do PR acima. |
| `e2e` | ❌ failure | [Run 40818618235](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40818618235): login E2E ficou em `/login` após 20 s; `e2e-cleanup` respondeu `HTTP 403 email_not_in_allow_list` para os usuários de teste. Shards de regressão foram pulados porque o gate smoke falhou no setup. |
| Segurança, contratos e build | ❌ failure após rerun | [Run 40818618224](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40818618224), tentativa 2: suíte completa passou (5.846/68), mas a simulação `simular-controles-auditoria.py` falhou ao baixar `public.ecr.aws/supabase/postgres:17.6.1.063` com `toomanyrequests: Data limit exceeded`. A tentativa 1 teve a mesma causa externa. |
| Copilot PR reviewer | ❌ failure | [Run 40818631873](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40818631873): HTTP 402, limite de uso adicional do plano Copilot atingido. Requer aumentar o limite/uso adicional ou aguardar o reset em `github.com/settings/copilot/features`. |
| Vercel Agent Review | ⚪ neutral | Billing do time desativado; revisão automatizada não executada. Não foi falha de código. |

**Ação necessária para E2E:** no projeto Supabase de construção, configurar o secret da Edge Function `e2e-cleanup`, `E2E_CLEANUP_ALLOWED_EMAILS`, com os endereços exatos de todas as contas E2E configuradas no GitHub Actions, em CSV. O código normaliza espaços e caixa. Também confirmar no GitHub que as contas correspondem a usuários ativos e que as credenciais/TOTP estão atuais. Não enviar os valores de senha ou TOTP na conversa.

**Ação necessária para os checks externos:** o administrador do time deve resolver o limite do Copilot. Para o ECR Public, aguardar a cota se restabelecer; se persistir, migrar as simulações para um registry espelho aprovado. O rerun confirmou falha recorrente de infraestrutura, sem erro de teste/código.

O check do workflow manual `Publicar funções Sicoob` não roda em PR: ele exige `refs/heads/main` e input `PUBLICAR`. A correção foi reproduzida localmente em cinco testes positivos/negativos, mas a confirmação remota permanece pendente até a branch chegar à `main`; esta rodada não publicou funções.

**Integração:** PR #157 inclui alteração de dependências e código da aplicação, e os checks obrigatórios do PR não estão todos verdes. Não foi mesclado nem publicado em produção. Nenhuma escrita, migration ou publicação foi feita no Supabase nesta rodada.

### Reconciliação do banco canônico

Leitura do MCP do projeto `cfmzkthhgliqelozlmwu`: 137 migrations registradas; a mais recente é `20261022230000_repair_migration_ledger_and_harden_search_path`. A verificação `Migration ledger drift` mais recente na `main` permanece verde ([run 40670784182](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40670784182)). A auditoria anterior identificou 12 entradas remotas sem arquivo-fonte na `main`; o PR [#151](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/151) restaura esses arquivos. Não reaplicar essas migrations: já constam no ledger remoto. O PR #157 não altera migrations nem schema.

### Atualização da correção de dependências

- `undici` passou de `8.10.2` para `8.12.3`, dentro da faixa semver já declarada por `vite-plugin-mkcert`; o `npm audit` local deixou de reportar os oito advisories desse pacote.
- `zod` passou para `4.6.7` e `@hookform/resolvers` para `6.0.2`; foram adaptados os dois usos legados incompatíveis e adicionados testes para mensagens obrigatórias do schema de metas.
- O audit local agora passa sem vulnerabilidades. Typecheck e 276 testes focados também passaram; a suíte completa pós-commit passou com 5.841 testes aprovados e 68 ignorados, sem regressão (baseline 5.839/68); build, lint e typecheck também passaram.
- As três versões do CodeQL foram alinhadas ao mesmo SHA 4.39.1. A verificação do deploy de funções foi corrigida para aceitar versão igual apenas com confirmação “No change found” específica da função. Os cinco testes unitários direcionados passaram. Ambas as correções ainda aguardam CI no PR; a última execução da `main` continua refletindo o código anterior.
- Não houve alterações no Supabase nesta rodada: não era necessário aplicar migration nem publicar funções para corrigir a lógica de confirmação.
- A `main` remota continua vulnerável até esta branch ser enviada, passar os checks e ser integrada. Os workflows correspondentes ainda não foram reexecutados na `main`.

Atualizado em: 2026-10-29

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

## Rechecagem pós-commit `0003e00ed` — 29/10/2026

### PR #157 — checks do SHA `0003e00ed361bd0d73527e670396a7def11a6c35`

| Check | Estado | Motivo / evidência |
|---|---|---|
| `e2e` | ❌ failure | [Run 40821761584](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40821761584): `tests/rls/e2e-cleanup-rate-limit.test.ts`, cenário “UPDATE como anon falha”, excedeu 15 s. A chamada REST remota ficou sem resposta dentro do limite; não há evidência de que a asserção de RLS falhou. Reprodução remota local indisponível sem as credenciais de teste do GitHub Actions; sem `RUN_REMOTE_RLS_TESTS=1`, o teste pula e não exercita o Supabase. A repetição no PR #151 indica instabilidade persistente do teste remoto, não uma falha nova causada pelo commit documental. |
| `Segurança, contratos e build` | ❌ failure | [Run 40821761554](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40821761554): `simular-controles-auditoria.py` não obteve a imagem `public.ecr.aws/supabase/postgres:17.6.1.063`; ECR respondeu `toomanyrequests: Data limit exceeded` após três tentativas. |
| `npm audit — CVE Scan` | ✅ success | [Run 40821761612](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40821761612). |
| `Analyze (javascript-typescript)` | ✅ success | [Run 40821761556](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40821761556). |
| `Gitleaks — Secret Scan` | ✅ success | [Run 40821761612](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40821761612). |
| `e2e` regressivo por shards | ⏭️ skipped | O gate E2E falhou no teste remoto anterior; os shards não rodaram. |
| `copilot-pull-request-reviewer` | ❌ failure externo | [Run 40821772919](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40821772919): limite de uso adicional do Copilot (HTTP 402). Não é check obrigatório da proteção da branch. |
| Vercel Agent Review | ⚪ neutral | Billing de revisão do time desativado; não é falha de build. |

Os demais checks obrigatórios remotos concluíram com sucesso. O PR continua aberto e não pode ser mesclado enquanto `e2e` e `Segurança, contratos e build` estiverem vermelhos. As correções de npm audit/CodeQL estão demonstradas no PR, mas a `main` ainda conserva os workflows com falha até integração; nenhum deploy foi feito.

### Ledger Supabase e repositório

Leitura do ledger canônico retornou 137 entradas, com última versão `20261022230000`. A `main` carece das fontes de 12 migrations já aplicadas; o PR [#151](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/151) as restaura e, no snapshot de seu branch, as 137 versões remotas têm fonte correspondente. O PR #151 segue bloqueado pelos checks `e2e`, `npm audit`, CodeQL e `Segurança, contratos e build`; não marcar a reconciliação como concluída antes de o conteúdo chegar à `main` com checks verdes.

Os 462 arquivos locais sem entrada no ledger são passivo histórico registrado na baseline. Não executar esses arquivos em lote, não fabricar linhas no ledger e não alterar o schema para “alinhar” contagens. O PR #157 não contém mudança de banco e nenhum comando de escrita/migration foi executado nesta sessão.

### Atualização após novo diagnóstico — 29/10/2026

No SHA `6ce1a6b52a991fd0db5e11f455c56f619c5ae4ab`, o [run E2E 40822748029](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40822748029) terminou com `Hook timed out in 45000ms` em `beforeAll` de `tests/rls/e2e-cleanup-rate-limit.test.ts:71`. A operação que travou foi a inserção administrativa do canário, antes das asserções de RLS. O mesmo SHA também mostra, no MCP, timeout de Management API ao executar `supabase_db_health` e `supabase_db_query` read-only. O ledger continua legível pelo endpoint de migrations, mas isso não demonstra saúde do PostgREST nem permite reexecutar localmente o cenário sem credenciais do Actions. Pendência: restaurar/conferir a disponibilidade REST do Supabase de construção e então rerodar o E2E; manter o gate falhando até haver resposta real.

Para o ECR, os dois scripts `scripts/qa/simular-controles-auditoria.py` e `scripts/qa/simular-acl-efetiva.py` foram alterados localmente para usar a imagem oficial GHCR `ghcr.io/supabase/postgres:17.6.1.063`. A inspeção `docker manifest inspect` confirmou digests por plataforma idênticos entre ECR e GHCR; os dois simuladores passaram localmente. O próximo SHA precisa confirmar se os runners GitHub conseguem baixar GHCR e concluir o gate; até esse resultado, registrar como mitigação candidata, não como workflow resolvido.
