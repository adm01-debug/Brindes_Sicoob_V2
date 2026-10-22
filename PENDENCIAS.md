# Pendências de CI — adm01-debug/Brindes_Sicoob_V2

Atualizado em: 2026-10-22

Cada seção abaixo descreve um workflow que falha por motivo externo ao código do repositório.
O erro exato foi extraído do run mais recente disponível em main.

---

## Workflow: `npm_and_yarn` — Dependabot `@vitest/mocker` Update

**Run atual:** `39775463512` · Job `119813160239` · SHA `ae1b92b337e1`  
**Erro exato:**

```
security_update_not_possible
dependency-name: @vitest/mocker
latest-resolvable-version: 4.1.11
lowest-non-vulnerable-version: 4.1.12
explanation: A patched version exists for @vitest/mocker, but the available
             update path still resolves it to 4.1.11
```

**Causa raiz:** Dois alertas Dependabot abertos (`#1` e `#2`) — CVEs moderadas em `@vitest/mocker` 4.1.11:

| Alerta | GHSA | CVE | Resumo | Gravidade |
|---|---|---|---|---|
| #1 | GHSA-xp26-3454-mjgp | CVE-2026-112950 | Windows backslash traversal ignora allowlist do fix do GHSA-82fw | medium (CVSS 5.9) |
| #2 | GHSA-qxg6-89mg-rqv8 | CVE-2026-112949 | Code injection via manual mock registration não autenticado | medium (CVSS 4.7) |

**Versão afetada:** `@vitest/mocker` >= 2.1.0-beta.7, < 4.1.12  
**Fix:** `@vitest/mocker` 4.1.12 (patch de segurança; retrocompatível com vitest 4.x)  
**Impacto:** Apenas ambiente de **desenvolvimento local** — o servidor Vite não sobe em produção. Não afeta código em produção.  
**Por que o Dependabot não corrige automaticamente:** O `package-lock.json` pina `@vitest/mocker@4.1.11` via `vitest@4.1.11`; o Dependabot não encontrou caminho de resolução automática para 4.1.12.

**O que você precisa fazer:**

```bash
# Na sua máquina com Node >= 24 e acesso à internet
cd <pasta do projeto>
npm install @vitest/mocker@4.1.12 --save-dev --package-lock-only
# ou atualize vitest diretamente:
npm update @vitest/mocker
git add package-lock.json
git commit -m "fix(deps): atualiza @vitest/mocker para 4.1.12 (GHSA-qxg6-89mg-rqv8, GHSA-xp26-3454-mjgp)"
git push
```

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

## Workflow: `e2e` (Playwright — testes de autorização de edge functions)

**Run de referência:** `39776300770` · Job `119816156308`  
**Observação:** este run foi disparado por evento `pull_request` na branch
`fix/relatorio-ci-e-sentinel-2` — **não** é um push à `main`. O workflow `e2e.yml`
possui filtros de path e não dispara em commits doc-only na `main`; por isso não há
run de push recente na `main` para este workflow. O erro Supabase 402 abaixo é
reproduzível independente do evento de disparo enquanto a quota estiver esgotada.

**Erro exato:**

```
AssertionError: expected [ 401, 403 ] to include 402
❯ tests/security/edge-authz-bypass.test.ts:77:26
```

**Causa raiz:** As edge functions retornam HTTP 402 (Payment Required) em vez de 401/403.
O teste está correto — o problema é de quota/billing Supabase, igual ao Enterprise Compliance.

**O que você precisa fazer:** mesma ação da seção Enterprise Compliance acima (restaurar quota
do projeto Supabase). O código do teste **não deve ser alterado**.

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

## Inventário completo de falhas — main (status=failure, consultado em 2026-10-22)

Lista lida item a item via API (`status=failure&branch=main`, 50 runs). Resultado:

| Workflow com failure ATUAL (SHA pós-PR #129) | Run mais recente | Causa |
|---|---|---|
| Running Copilot Code Review | `39785094125` (SHA `4f5de103`) | Quota GitHub Copilot 402 — externo |
| Enterprise Compliance & Audit Reporting | `39780447872` (SHA `4b3d6cae`) | Supabase quota esgotada — externo |
| npm_and_yarn @vitest/mocker | `39775463512` (SHA `ae1b92b3`) | `security_update_not_possible` — Dependabot |

Todos os outros 47 failures da lista são em SHAs antigos (anteriores a PR #126/#128/#129) e estão resolvidos.

**Workflows com failure em PR #136 (pull_request, não push à main):**
- `e2e`: failure por Supabase quota 402 — mesmo bloqueio externo documentado acima.

---

## Gap de Segurança: Ausência de `npm audit` no CI

**Descoberto em:** Auditoria exaustiva 2026-10-22

**Situação:** Nenhum dos 13 workflows faz `npm audit` ou varredura equivalente de vulnerabilidades em dependências JS. O workflow `security.yml` cobre apenas Gitleaks (secrets). CVEs em dependências do `package.json` só são detectadas via Dependabot e por revisão manual.

**Risco:** Médio — dependências com CVE podem ser mergeadas sem alerta no CI. Atualmente mitigado pelo Dependabot ativo, mas sem gate automático no PR.

**Correção recomendada:** Adicionar step no `security.yml` ou `ci.yml`:
```yaml
- name: Auditoria de dependências
  run: npm audit --audit-level=high
```

**Por que não foi corrigido agora:** `npm ci` é estruturalmente impossível neste container (registry privado `europe-west1-npm.pkg.dev/lovable-core-prod/sandbox-npm-cache`). A adição do step deve ser feita pelo owner localmente e testada antes de mergear.

**O que o owner precisa fazer:**
1. Executar `npm audit` localmente para ver o estado atual
2. Adicionar o step ao workflow em branch de feature
3. Testar se o step passa antes de mergear

---

## Workflows corrigidos (resolvidos em PRs anteriores)

| Workflow | Causa | Correção | PR |
|---|---|---|---|
| Branch Protection Sentinel | Squash merge com mensagem customizada sem `(#NNN)` | PR mergeado sem `commit_message` custom (GitHub gera título com `(#NNN)`) | #128 |
| Enterprise Compliance — Security Definer ACL | `audit_security_definer_acl()` sem `get_public_favorite_list` e `get_public_favorite_reactions` | Migration `20261022120000_add_public_favorites_to_security_definer_allowlist.sql` | #126 |
| Migration Ledger Drift | Fingerprint de `20261022120000` calculado com `local_sha256` incorreto; novo digest correto: `e2815b0...` | Corrigido fingerprint no `migration-ledger-baseline.json` | #129 |
| 5 CVEs high (vite ≤6.4.3) | GHSA-698v, GHSA-r825, GHSA-587h, GHSA-9jrq, GHSA-rq7h | `vite` 6.4.3 → 6.4.5 | #126 |
| Qualidade contínua (`ci.yml`) — ECR rate limit | `toomanyrequests: Data limit exceeded` ao puxar `public.ecr.aws/supabase/postgres:17.6.1.063` em dois steps (scripts `simular-controles-auditoria.py` e `simular-acl-efetiva.py`) | Rate limit do ECR Public se dissipou naturalmente; run `39780447863` → **success** | automático |
