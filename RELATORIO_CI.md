# Relatório CI — adm01-debug/Brindes_Sicoob_V2

Gerado em: 2026-10-22

---

## 1. Inventário completo de workflows

### 1.1 Estado pré-merge (SHA `a82d92b4` — main antes do PR #126)

| Workflow | Conclusão | Observação |
|---|---|---|
| Branch Protection Sentinel | **success** | — |
| Security Scan | success | — |
| Migration Ledger Drift | **failure** | fingerprint de `20261022120000` desatualizado |
| Enterprise Compliance & Audit Reporting | **failure** | `audit_security_definer_acl()` sem `get_public_favorite_list` e `get_public_favorite_reactions` |
| Qualidade contínua (`ci.yml`) | **failure** | ECR rate limit: `toomanyrequests: Data limit exceeded` |
| Segurança, contratos e build (`sicoob-ci.yml`) | **failure** | ECR rate limit (mesmo container `public.ecr.aws/supabase/postgres:17.6.1.063`) |
| e2e | **failure** | Supabase 402 — quota de edge functions esgotada |
| copilot-pull-request-reviewer | **failure** | GitHub Copilot quota 402 |
| CodeQL | success | — |
| Portal Sicoob | success | — |
| npm_and_yarn (Dependabot) | success | — |

### 1.2 Estado pós-merge PR #126 (SHA `ae1b92b3` — main atual)

| Workflow | Conclusão | Mudança | Observação |
|---|---|---|---|
| Branch Protection Sentinel | **failure** | **REGRESSÃO** | Commit message do squash não termina com `(#NNN)` — ver seção 3 |
| Security Scan | **success** | Manteve ✓ | — |
| Migration Ledger Drift | *em execução* | Esperado: success | fingerprint atualizado no PR #126 |
| Enterprise Compliance & Audit Reporting | **failure** | Mudou de causa | Agora falha no `Database RLS Scan` com `exceed_edge_functions_invocations_quota, exceed_egress_quota` |
| Qualidade contínua (`ci.yml`) | *em execução* | Aguardando | ECR rate limit (externo) |
| Segurança, contratos e build | *não rodou neste SHA* | — | — |
| e2e | *não rodou neste SHA* | — | — |
| copilot-pull-request-reviewer | *não rodou neste SHA* | — | — |
| CodeQL | *em execução* | — | — |
| Portal Sicoob | *em execução* | — | — |
| npm_and_yarn | *em execução* | — | — |

---

## 2. Baseline local

Baseline completo não foi possível por restrição de rede no container cloud (`npm ci` não concluiu).
O repositório tem vite 6.4.5 (sem CVEs) conforme `package.json` e `package-lock.json`.

---

## 3. Diagnóstico detalhado e erros exatos

### 3.1 Branch Protection Sentinel — REGRESSÃO (PR #126)

**Causa:** O PR #126 foi mergeado via squash com `commit_message` customizado. O commit gerado na main tem a mensagem:

```
fix(ci): corrige compliance, ledger drift e CVEs vite 6.4.5
```

O sentinel exige que a primeira linha termine com `(#NNN)` para squash merges. O commit não termina com `(#126)` pois a mensagem customizada substituiu o formato padrão do GitHub.

**Erro exato do job `119813011770` (22/10/2026 12:05:45):**
```
##[error]Push em main sem padrao de PR/bot/release detectado.
```

**Correção:** Este PR (#127 ou seguinte) será mergeado SEM `commit_message` customizado, para que o GitHub gere automaticamente `<título do PR> (#NNN)`, satisfazendo o padrão do sentinel.

---

### 3.2 Enterprise Compliance & Audit Reporting

**Antes do PR #126 (SHA `a82d92b4`):**
- `Security Definer ACL Scan` falhava com `audit_security_definer_acl()` retornando violações
- Causa: `get_public_favorite_list` e `get_public_favorite_reactions` ausentes da lista revisada

**Correção aplicada no PR #126:**
- Migration `20261022120000_add_public_favorites_to_security_definer_allowlist.sql` adicionada
- Função `audit_security_definer_acl()` reescrita com lista correta de 3 assinaturas
- Verificado via MCP: `SELECT * FROM public.audit_security_definer_acl()` → 0 linhas (sem violações)

**Novo bloqueio pós-PR #126 (SHA `ae1b92b3`):**
O workflow agora falha no step anterior (`Database RLS Scan`) com erro externo de billing Supabase antes mesmo de chegar ao `Security Definer ACL Scan`:

**Erro exato do job `119813012556` (22/10/2026 12:06:00):**
```
check_tables_rls falhou: Service for this project is restricted due to the following violations:
exceed_edge_functions_invocations_quota, exceed_egress_quota.
The project owner must upgrade their plan or remove spend caps to restore service.
```

**Status:** Bloqueio externo (quota Supabase) — mesma categoria que o e2e.

---

### 3.3 Qualidade contínua (`ci.yml`) — bloqueio externo ECR

**Erro exato do job `119807381249`:**
```
RuntimeError: docker run falhou após 3 tentativas: Unable to find image 
'public.ecr.aws/supabase/postgres:17.6.1.063' locally
docker: Error response from daemon: toomanyrequests: Data limit exceeded
```

Script: `scripts/qa/simular-controles-auditoria.py`, linha 32, função `start_container()`

Causa: ECR Public rate limit por IP de origem do runner do GitHub Actions.

---

### 3.4 Segurança, contratos e build (`sicoob-ci.yml`) — bloqueio externo ECR

Mesmo container `public.ecr.aws/supabase/postgres:17.6.1.063`, mesmo ECR rate limit.

**Erro exato do job `119807381249` (22/10/2026):**
```
RuntimeError: docker run falhou após 3 tentativas: Unable to find image
'public.ecr.aws/supabase/postgres:17.6.1.063' locally
docker: Error response from daemon: toomanyrequests: Data limit exceeded
```

---

### 3.5 e2e — bloqueio externo Supabase billing

**Erro exato do job `119807418285`:**
```
##[error]AssertionError: expected [ 401, 403 ] to include 402
❯ tests/security/edge-authz-bypass.test.ts:71:26
```

Edge functions retornam HTTP 402 (Payment Required) em vez de 401/403. O teste está correto.
Causa: quota de edge functions do projeto Supabase esgotada.

---

### 3.6 copilot-pull-request-reviewer — bloqueio externo GitHub Copilot

**Erro exato do job `119807418441`:**
```
errorType: 'quota', statusCode: 402,
[cause]: [Error: You've reached your additional usage limit for your plan.
Go to https://github.com/settings/copilot/features for more details.
(Request ID: A010:F7A7C:53C29BC:59282CD:6AD9F8E9)]
```

---

## 4. Correções realizadas no PR #126

| Problema | Causa raiz | Correção |
|---|---|---|
| Enterprise Compliance (Security Definer ACL) | `audit_security_definer_acl()` com lista incompleta | Migration `20261022120000` com 3 assinaturas corretas, aplicada ao DB |
| Migration Ledger Drift | Fingerprint de `20261022120000` desatualizado | `migration-ledger-baseline.json` atualizado |
| 5 CVEs high (vite ≤6.4.3) | GHSA-698v, GHSA-r825, GHSA-587h, GHSA-9jrq, GHSA-rq7h | vite 6.4.3 → 6.4.5 em `package.json` e `package-lock.json` |

---

## 5. Bloqueios externos (requerem ação do owner)

| Workflow | Causa | Ação necessária |
|---|---|---|
| Qualidade contínua, Segurança/contratos | ECR Public rate limit (`toomanyrequests: Data limit exceeded`) | Autenticar runner com credenciais AWS (`AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`) ou migrar imagem para GHCR/Docker Hub |
| e2e, Enterprise Compliance | Supabase quota esgotada (`exceed_edge_functions_invocations_quota, exceed_egress_quota`) | Verificar e recarregar quota do projeto Supabase em uso pelos testes |
| copilot-pull-request-reviewer | GitHub Copilot quota 402 | Verificar billing em github.com/settings/billing e renovar plano |

---

## 6. Regressões introduzidas e correções

| Regressão | Causa | Correção |
|---|---|---|
| Branch Protection Sentinel | Commit de squash merge sem `(#NNN)` no final | Este PR (#127) será mergeado com título que produz `(#127)` no squash |
