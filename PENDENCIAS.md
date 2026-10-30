# Pendências de CI — adm01-debug/Brindes_Sicoob_V2

Atualizado em: 2026-10-30

As pendências distinguem falhas corrigíveis no candidate de bloqueios externos ou
execuções antigas sem logs recuperáveis. O inventário considera a execução mais
recente na `main` por workflow e registra quando não há evidência suficiente para
atribuir uma causa técnica.

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

## Inventário atual da `main` — 30/10/2026

Falhas consideradas somente quando a execução mais recente da `main` está em
`failure`. As correções estão publicadas na branch candidate
`fix/quote-price-authority-311333` e submetidas ao PR draft #175; ainda não foram
incorporadas à `main`. Os checks da primeira revisão do PR apontaram falso
positivo de Gitleaks para UUIDs de teste em commit histórico; o valor foi trocado
no arquivo atual e os fingerprints históricos foram allowlisted de forma pontual.

| Workflow | Última execução | Causa provável confirmada | Estado da correção |
|---|---|---|---|
| Publicar funções Sicoob | [40772348102](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40772348102) | Verificador exigiu aumento de versão para função que continuou na versão 5 após deploy sem alteração | Corrigido na branch candidate; validação remota necessária, sem executar deploy |
| Security Scan | [40602983158](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983158) | `npm audit` alto em `undici` e `zod` | Corrigido no candidate; audit local zerado e Security Scan passou no run [41064612611](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41064612611). Gitleaks passou após allowlist dos fingerprints históricos exatos |
| Qualidade contínua | [40602982964](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982964) | Gate `check:npm-audit`, mesmos alertas altos | Corrigido no candidate; Qualidade passou no run [41064612892](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41064612892). As quatro RPCs da migration P045 seguem com allowlist pontual até aplicar a migration e atualizar inventário remoto |
| CodeQL | [40602983073](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983073) | `init` em 4.39.1 e `autobuild/analyze` em 4.38.2; SARIF não gerado | Referências SHA alinhadas; CodeQL passou no run [41064612529](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41064612529) |
| Bundle Size Check | [36353765911](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/36353765911) | Job falhou; log expirou (HTTP 404), causa do run antigo não comprovável | Candidate passou no run [41064612555](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41064612555); medição local: 664 chunks, 10.748.443 bytes, avisos não bloqueantes |
| Lighthouse Performance Audit | [36353765910](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/36353765910) | Job falhou; log expirou (HTTP 404), causa do run antigo não comprovável | Candidate passou no run [41064612773](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41064612773); não foi necessário alterar secret |
| E2E (Playwright) | [37775702358](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/37775702358) | `startup_failure`, nenhum job criado; a API não fornece causa detalhada | Bloqueado até configurar um projeto de homologação isolado; execução da primeira revisão atingiu o projeto canônico e mostrou demora de 22,3 s em `get_sicoob_access_state`, mantendo a rota no loader de permissões |
| Running Copilot Code Review | [39785094125](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39785094125) | HTTP 402 `quota`, limite adicional de uso Copilot atingido | Bloqueio externo; proprietário deve renovar/aguardar reset do plano |

Workflows verdes confirmados na consulta: Migration ledger drift
([41013281253](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41013281253)),
Branch Protection Sentinel ([40602983038](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983038)),
Enterprise Compliance & Audit Reporting ([40602982958](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982958))
e Portal Sicoob ([39868499315](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39868499315)).
Monthly DB Audit também concluiu com sucesso em
[36794161452](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/36794161452).

---

### Bloqueio e incidente de configuração do E2E

- O run [41057184979](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41057184979) executou a jornada autenticada contra o projeto `cfmzkthhgliqelozlmwu`: os secrets `VITE_SUPABASE_*` eram usados como destino do E2E, sem exigir projeto exclusivo. O trace mostrou `PATCH /rest/v1/profiles` (204) e `POST /rest/v1/telemetry_events` (201); não foi feita tentativa de desfazer as alterações.
- O screenshot mostrou a rota bloqueada em “Carregando permissões...”. Duas chamadas a `get_sicoob_access_state` levaram aproximadamente 22,3 s; `user_roles` respondeu 200. Isso excede o limite de 20 s do smoke. A evidência aponta atraso no bootstrap de autenticação/permissões, mas não prova causa server-side nem relação com o candidate.
- O artefato de evidências e o relatório HTML do run foram excluídos do GitHub (IDs `12977402436` e `12978146122`) porque continham material de sessão no trace. Não registrei valores. O workflow candidate agora não publica traces, screenshots ou relatórios brutos e barra o job antes de acessar o Supabase se a configuração E2E isolada estiver ausente/inconsistente.
- **Ação do responsável:** revisar os registros de perfil/telemetria da conta E2E no projeto citado e encerrar sessões/rotacionar as contas de teste. Configurar `vars.E2E_SUPABASE_PROJECT_ID` e os secrets `E2E_SUPABASE_URL`, `E2E_SUPABASE_PUBLISHABLE_KEY`, `E2E_SUPABASE_SERVICE_ROLE_KEY` e `E2E_SUPABASE_CLEANUP_TOKEN`, além de contas de teste provisionadas nesse mesmo projeto. A nova revisão confirmou o bloqueio seguro: o run [41059570928](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41059570928) falhou no job `Validar origem confiável`, etapa `Exigir Supabase E2E isolado`, com os novos nomes de variável/secrets ausentes; nenhum job de teste executou ou acessou o banco.

## P045 — Integridade de preços de orçamento (30/10/2026)

**Status do candidate:** branch publicada e PR draft #175 aberto; SHA final
validado localmente e no CI, sem aplicar migration ou publicar Edge Function
remota. No SHA `8f858d72`, Qualidade contínua, CodeQL, Security Scan, Bundle,
Lighthouse e Portal Sicoob passaram. E2E foi bloqueado antes dos testes porque
faltam a variável e os secrets do projeto de homologação isolado; nenhum shard
executou. O run E2E não acessou o banco.

Falhas intermediárias foram reproduzidas e corrigidas antes da última revisão:
o run `41059571119` revelou setup duplicado na simulação de idempotência; o
run `41062432761` falhou no pull da imagem ECR por `Data limit exceeded`. O
script idempotente e os dois simuladores PostgreSQL afetados passaram localmente
após as correções, e a Qualidade passou no SHA final.

- Migration versionada e allowlisted: `20261030120000_quote_price_attestation_gate.sql`.
- Edge Function autenticada e registrada no manifesto, configuração e workflow
  de publicação: `quote-price-attestation`.
- Simulação PostgreSQL local cobre adulteração, replay de token, rollback,
  alteração de frete, versionagem e preservação de itens/personalizações.
- Relatório baseline × candidate em `RELATORIO_CI.md` e detalhes em
  `docs/execucao/p045-integridade-precos-20261030.md`.

### Pendências de fechamento

1. Executar E2E autenticado depois que o responsável configurar `vars.E2E_SUPABASE_PROJECT_ID`, os secrets `E2E_SUPABASE_URL`, `E2E_SUPABASE_PUBLISHABLE_KEY`, `E2E_SUPABASE_SERVICE_ROLE_KEY`, `E2E_SUPABASE_CLEANUP_TOKEN` e contas de teste no mesmo projeto isolado. O run final [41064612852](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41064612852) parou na validação antes dos testes.
2. Não há prova de que a Edge Function foi publicada nem de que a migration foi
   aplicada ao Supabase de construção. O fluxo foi versionado; não executado.
3. Revisar as gravações de perfil/telemetria observadas no run anterior que
   apontou ao projeto canônico, encerrar as sessões/rotacionar contas de teste
   e registrar a revisão do responsável; não desfazer dados sem conhecer os
   valores corretos.
4. O SECURITY DEFINER ACL remoto não foi verificado porque faltam credenciais
   neste ambiente.
5. A configuração do projeto isolado de homologação segue ausente no GitHub
   Actions: `vars.E2E_SUPABASE_PROJECT_ID` e os secrets
   `E2E_SUPABASE_URL`, `E2E_SUPABASE_PUBLISHABLE_KEY`,
   `E2E_SUPABASE_SERVICE_ROLE_KEY` e `E2E_SUPABASE_CLEANUP_TOKEN`. O workflow
   confirmou a ausência sem revelar valores; nenhum segredo foi consultado.

### Checks finais do candidate — PR #175 / SHA `8f858d7272d09f95717154688f6b84967c1a1cc0`

| Workflow | Execução | Estado |
|---|---:|---|
| Qualidade contínua | [41064612892](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41064612892) | `success` |
| Security Scan | [41064612611](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41064612611) | `success` |
| CodeQL | [41064612529](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41064612529) | `success` |
| Bundle Size Check | [41064612555](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41064612555) | `success` |
| Lighthouse Performance Audit | [41064612773](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41064612773) | `success` |
| Portal Sicoob | [41064612737](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41064612737) | `success` |
| E2E (Playwright) | [41064612852](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41064612852) | `failure` — bloqueado antes dos testes; shards ignorados, sem acesso ao banco |

`Vercel Preview Comments` passou e `Vercel Agent Review` ficou `neutral` por
indisponibilidade de créditos do serviço. A PR #175 segue draft e bloqueada;
E2E autenticado e revisão do incidente histórico ainda dependem do responsável.
O workflow de publicação não foi executado, e não houve migration nem deploy
remoto.

Não executar deploy/migration no banco canônico até concluir homologação, revisar
checks da PR e confirmar explicitamente o alvo de construção.
