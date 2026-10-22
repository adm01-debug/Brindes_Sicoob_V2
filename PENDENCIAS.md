# Pendências de CI — adm01-debug/Brindes_Sicoob_V2

Atualizado em: 2026-10-22

Cada seção abaixo descreve um workflow que falha por motivo externo ao código do repositório.
O erro exato foi extraído do run mais recente disponível em main.

---

## Workflow: Qualidade contínua (`ci.yml`)

**Run atual:** `39775422345` · Job `119813012334`  
**Step:** "Simular controles de auditoria e permissões em PostgreSQL descartável"  
**Erro exato:**

```
RuntimeError: docker run falhou após 3 tentativas: Unable to find image
'public.ecr.aws/supabase/postgres:17.6.1.063' locally
docker: Error response from daemon: toomanyrequests: Data limit exceeded
```

**Causa raiz:** Rate limit do Amazon ECR Public por IP do runner do GitHub Actions.  
**Arquivos afetados no mesmo job:**
- `scripts/qa/simular-controles-auditoria.py`, linha 32, função `start_container()` (step "Simular controles de auditoria e permissões em PostgreSQL descartável")
- `scripts/qa/simular-acl-efetiva.py` (step "Simular ACL padrão, sobrecargas e herança de papéis") — mesma imagem ECR, mesmo erro

**O que você precisa fazer:**

- **Opção A (recomendada):** Adicionar os secrets `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY`
  (conta AWS com permissão `ecr-public:GetAuthorizationToken`) e atualizar o workflow para rodar
  `aws ecr-public get-login-password --region us-east-1 | docker login --username AWS --password-stdin public.ecr.aws`
  antes do step Docker.
- **Opção B:** Migrar a imagem `public.ecr.aws/supabase/postgres:17.6.1.063` para Docker Hub
  ou GHCR, que não impõe rate limit para pulls autenticados.

---

## Workflow: Qualidade contínua — job "Segurança, contratos e build" (`ci.yml`)

**Run de referência:** Job `119807381249` (2026-10-22)  
**Erro exato:**

```
RuntimeError: docker run falhou após 3 tentativas: Unable to find image
'public.ecr.aws/supabase/postgres:17.6.1.063' locally
docker: Error response from daemon: toomanyrequests: Data limit exceeded
```

**Causa raiz:** Mesma imagem ECR Public `public.ecr.aws/supabase/postgres:17.6.1.063` no
job "Segurança, contratos e build" dentro do mesmo `ci.yml` — mesmo rate limit de IP.
A solução é idêntica à seção anterior.

**O que você precisa fazer:** mesma ação da seção anterior (`ci.yml`).

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
