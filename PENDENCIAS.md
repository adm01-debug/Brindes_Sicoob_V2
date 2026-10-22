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

**Run atual:** `39775422349` · Job `119813012556`  
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

**Run atual:** `39776300770` · Job `119816156308`  
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

**Run atual:** `39776314308` · Job `119816047330`  
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

## Workflows corrigidos (resolvidos em PRs anteriores)

| Workflow | Causa | Correção | PR |
|---|---|---|---|
| Branch Protection Sentinel | Squash merge com mensagem customizada sem `(#NNN)` | PR mergeado sem `commit_message` custom (GitHub gera título com `(#NNN)`) | #128 |
| Enterprise Compliance — Security Definer ACL | `audit_security_definer_acl()` sem `get_public_favorite_list` e `get_public_favorite_reactions` | Migration `20261022120000_add_public_favorites_to_security_definer_allowlist.sql` | #126 |
| Migration Ledger Drift | Fingerprint de `20261022120000` calculado com `local_sha256` incorreto; novo digest correto: `e2815b0...` | Corrigido fingerprint no `migration-ledger-baseline.json` | #129 |
| 5 CVEs high (vite ≤6.4.3) | GHSA-698v, GHSA-r825, GHSA-587h, GHSA-9jrq, GHSA-rq7h | `vite` 6.4.3 → 6.4.5 | #126 |
| Qualidade contínua (`ci.yml`) — ECR rate limit | `toomanyrequests: Data limit exceeded` ao puxar `public.ecr.aws/supabase/postgres:17.6.1.063` em dois steps (scripts `simular-controles-auditoria.py` e `simular-acl-efetiva.py`) | Rate limit do ECR Public se dissipou naturalmente; run `39780447863` → **success** | automático |
