# Pendências de CI — adm01-debug/Brindes_Sicoob_V2

Atualizado em: 2026-10-28

Cada seção abaixo descreve um workflow que falha por motivo externo ao código do repositório.
O erro exato foi extraído do run mais recente disponível em main.

---

## Publicação das funções Sicoob — reconciliação em andamento

- Workflow [run 40772348102](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40772348102), branch `main`, SHA `e9d59026793b84fabeaeec9da890a068f64d49c3`.
- A primeira tentativa foi bloqueada antes do deploy porque a política de Actions não permitia a dependência transitiva `oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6` usada pela versão fixada de `supabase/setup-cli`. A lista selecionada agora permite somente esse SHA imutável, mantendo os demais padrões restritos.
- Na segunda tentativa, a etapa de publicação terminou; a validação final falhou porque exigia incremento de versão até para funções cujo bundle não mudou. Evidência somente leitura após a tentativa: `expert-chat` 12→13, `external-db-bridge` 11→12, `sicoob-kit-quote` 5→6 e `sicoob-reorder` 5→6. `sicoob-approval-reconciliation`, `sicoob-artwork-register` e `sicoob-document-ingest` permanecem ativas na versão 5, sem atualização de bundle.
- Correção em revisão: aceitar versão igual somente quando a função continua `ACTIVE` e a versão não regrediu; versões ausentes, inativas ou menores continuam falhando. O deploy será repetido após a correção chegar à `main`.
- Nenhuma migration, DDL ou escrita de dados foi executada.

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

## Auditoria de paridade e bloqueios atuais (2026-10-28)

### PR #149 — correção do verificador de deploy

**PR:** https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/149
**Commit auditado:** `1c7fb0baab75119af58b9368156026551aac7d56`
**Estado:** aberto; não fazer merge enquanto os checks requeridos estiverem vermelhos.

| Check | Evidência | Causa confirmada / próximo passo |
|---|---|---|
| CodeQL | [run 40773041263](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40773041263) | `codeql-action/init` resolveu para 4.39.1, enquanto `autobuild` executou 4.38.2. O autobuild falhou por incompatibilidade de versões e, como efeito secundário, não houve SARIF. Uniformizar as referências do workflow. |
| npm audit | [run 40773041243](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40773041243) | Dois alertas altos na base `main`: `undici` e `zod`. A dependência direta da base é `zod ^3.22.4`; a correção indicada pelo advisory exige a versão 4.6.7. A atualização está em PR #148, ainda sem conclusão dos checks; não contornar nem enfraquecer o gate. |
| Segurança, contratos e build | [run 40773041031](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40773041031) | O gate falhou pelos mesmos dois alertas altos de `undici` e `zod`. |
| Revisão Copilot | [run 40773061761](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40773061761) | Falha externa por quota do serviço de revisão; aguardar restauração da quota e reexecutar. |
| E2E | [run 40773041195](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40773041195) | Não foi concluído na auditoria; conferir a conclusão antes de considerar o PR pronto. |

### PR #148 — atualização de dependências e CodeQL

**PR:** https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/148
Os checks de segurança, CodeQL, bundle, Lighthouse e Portal Sicoob passaram. O check de qualidade falhou ao baixar `public.ecr.aws/supabase/postgres:17.6.1.063` (`toomanyrequests: Data limit exceeded`); o E2E ainda estava em execução. Não integrar até que os checks requeridos estejam concluídos e verdes.

### Publicação controlada das Edge Functions

- Run [40772348102](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40772348102) terminou em `failure` por uma validação pós-deploy que exigia aumento de versão para funções cujo bundle não mudou. Na segunda tentativa, o workflow publicou quatro bundles: `expert-chat` 12→13, `external-db-bridge` 11→12, `sicoob-kit-quote` 5→6 e `sicoob-reorder` 5→6.
- Consulta posterior ao projeto canônico confirmou essas quatro funções em `ACTIVE`; `sicoob-approval-reconciliation`, `sicoob-artwork-register` e `sicoob-document-ingest` também estão `ACTIVE` em v5.
- Download somente leitura das 100 funções remotas e comparação com `origin/main`: as quatro funções publicadas estão alinhadas no código executável. A única diferença de arquivos em `external-db-bridge` consiste em testes locais `.test.ts`, que não fazem parte do bundle implantado.
- Comparação byte a byte das pastas: 83/100 idênticas; uma pasta adicional (`external-db-bridge`) difere somente por sete arquivos `.test.ts`, então 84/100 estão idênticas no código executável. As 16 funções com fonte executável divergente são `admin-audit-hook`, `bi-share-dossier`, `connections-auto-test`, `crm-db-bridge`, `e2e-cleanup`, `generate-ad-image`, `get-app-logs`, `github-fix-config`, `mcp-keys-issue`, `quote-sync`, `rls-audit`, `secrets-manager`, `sicoob-seed`, `sicoob-seed-qa`, `sync-quote-bitrix` e `trends-insights`. Não foram implantadas nesta ação porque não pertencem à allowlist do workflow e requerem auditoria de contrato individual.
- Seis diretórios de função presentes em `main` mas ausentes do projeto remoto: `e2e-auth-test`, `error-monitor`, `generate-mockup-nanobanana`, `migrate-helper`, `qa-block-monitor` e `sicoob-seed-debug`. Nenhuma função remota está sem diretório local correspondente.
- A correção do falso negativo foi enviada no PR #149. A nova publicação pelo workflow permanece pendente da correção ser integrada após checks verdes.

### Supabase canônico

- Projeto auditado: `cfmzkthhgliqelozlmwu`.
- Consulta somente leitura ao ledger confirmou a versão mais recente `20261022230000` (`repair_migration_ledger_and_harden_search_path`). A conferência prévia do allowlist encontrou as 27 migrations versionadas auditadas no ledger, com nome correspondente; as três migrations P0 também constam aplicadas.
- Esta alteração de CI não contém migration, DDL nem escrita de dados. Não foi feita alteração no schema ou nos dados do banco.

### Arquivos locais fora do GitHub

O checkout de trabalho `main` tem os seguintes itens ainda fora do GitHub:

- Modificados: `docs/correcoes-validacao-2026-09-14.md`, `src/components/admin/connections/secretNormalizers.ts`, `src/components/bi/ChurnRiskBanner.tsx`, `supabase/.temp/cli-latest`, `supabase/functions/bi-share-dossier/index.ts` e `supabase/functions/health-check/index.ts`.
- Não rastreados: `AUDITORIA.md`, `PLANO_100.md`, `graphify-out/historico/`, `supabase/.temp/linked-project.json`, `supabase/functions/bi-share-dossier/contract.ts`, `supabase/functions/health-check/contract.ts` e `tests/edge-functions/public-health-and-bi-share.test.ts`.

Não foram importados nesta auditoria: `supabase/.temp/*` são arquivos locais gerados; `health-check` altera comportamento/contrato; `bi-share-dossier` depende de segredo e pode invalidar links existentes; os demais arquivos locais precisam ser revisados quanto a escopo e origem antes de entrar no PR. O `ChurnRiskBanner.tsx` contém apenas churn de newline; a correção em `secretNormalizers.ts` já está presente na `main` remota. O checkout estava em `6b71bdc` e `origin/main` em `e9d5902`; o checkout local também está atrás do GitHub. Preservar o estado local até revisão individual, sem sobrescrever nem misturar com o PR #149.
