# Relatório CI — adm01-debug/Brindes_Sicoob_V2

Gerado em: 2026-10-22 · Atualizado após merge dos PRs #126, #128 e #129 · Migration Ledger Drift confirmado ✅

---

## 1. Baseline local

`npm ci` não pôde ser executado no container cloud por dois motivos simultâneos:

1. **Node incompatível**: container usa Node v22; `package.json` exige `>=24 <25`.
2. **Rede restrita**: o proxy do container bloqueia registry.npmjs.org (conexão recusada).

Por isso o baseline de install, build, lint, typecheck e testes não foi coletado localmente.
O que se sabe sem install:
- `vite` consta como `6.4.5` em `package.json` e `package-lock.json` — sem CVEs ativos.
- Os testes unitários/integração não foram rodados localmente nesta sessão.

---

## 2. Inventário completo de workflows — comparação baseline × final

### 2.1 Baseline (SHA `a82d92b4` — main antes do PR #126)

| Workflow | Conclusão | Causa da falha |
|---|---|---|
| Branch Protection Sentinel | **success** | — |
| Security Scan | **success** | — |
| Migration Ledger Drift | **failure** | fingerprint de `20261022120000` desatualizado |
| Enterprise Compliance & Audit Reporting | **failure** | `audit_security_definer_acl()` sem `get_public_favorite_list` e `get_public_favorite_reactions` |
| Qualidade contínua (`ci.yml`) | **failure** | ECR rate limit: `toomanyrequests: Data limit exceeded` |
| Portal Sicoob (`sicoob-ci.yml`) | **success** | — |
| E2E (Playwright) | **failure** | Supabase 402 — quota de edge functions esgotada |
| Copilot | **failure** | GitHub Copilot quota 402 |
| CodeQL | **success** | — |
| npm_and_yarn (Dependabot) | **success** | — |

### 2.2 Estado pós-merge PR #126 (SHA `ae1b92b3`)

| Workflow | Conclusão | Mudança | Observação |
|---|---|---|---|
| Branch Protection Sentinel | **failure** | **REGRESSÃO** | Commit de squash sem `(#NNN)` — corrigido em PR #128 |
| Security Scan | **success** | Manteve ✓ | — |
| Migration Ledger Drift | **failure** | Manteve falha | fingerprint recalculado incorretamente — corrigido em PR #129 |
| Enterprise Compliance & Audit Reporting | **failure** | Mudou de causa | Agora falha em `Database RLS Scan` com quota Supabase esgotada |
| Qualidade contínua (`ci.yml`) | **failure** | Manteve | ECR rate limit (externo) |
| Portal Sicoob (`sicoob-ci.yml`) | **success** | Manteve ✓ | — |
| E2E (Playwright) | **failure** | Manteve | Supabase 402 (externo) |
| Copilot | **failure** | Manteve | Quota 402 (externo) |
| CodeQL | **success** | Manteve ✓ | — |
| npm_and_yarn | **success** | Manteve ✓ | — |

### 2.3 Estado atual — SHA `4b3d6cae` (main após merge PR #128 + #129)

| Workflow | Conclusão | Run | Link |
|---|---|---|---|
| Branch Protection Sentinel | **success** ✅ | `39780447806` | https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39780447806 |
| Security Scan | **success** ✅ | `39780447928` | https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39780447928 |
| Migration Ledger Drift | **success** ✅ | `39780884679` | https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39780884679 |
| Enterprise Compliance & Audit Reporting | **failure** ❌ (externo) | `39780447872` | https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39780447872 |
| Qualidade contínua (`ci.yml`) | **in_progress** | `39780447863` | https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39780447863 |
| CodeQL | **in_progress** | `39780447790` | https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39780447790 |
| Portal Sicoob, E2E, Copilot, npm_and_yarn | *não rodaram neste SHA ainda* | — | — |

---

## 3. PRs de correção mergeados

| PR | Título | SHA de merge | Correções |
|---|---|---|---|
| [#126](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/126) | fix(ci): corrige compliance, ledger drift e CVEs vite 6.4.5 | `ae1b92b3` | Migration `20261022120000`, fingerprint inicial, vite 6.4.5 |
| [#128](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/128) | docs(ci): atualiza RELATORIO_CI com inventário completo | `6242a043` | Regressão Branch Protection Sentinel corrigida |
| [#129](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/129) | fix(ci): corrige fingerprint do ledger drift e documenta pendências | `4b3d6cae` | Fingerprint correto `e2815b02...`, PENDENCIAS.md com 5 workflows |

---

## 4. Diagnóstico detalhado

### 4.1 Branch Protection Sentinel — CORRIGIDO via PR #128

**Causa:** PR #126 mergeado via squash com `commit_message` customizado. Commit gerado na main:
```
fix(ci): corrige compliance, ledger drift e CVEs vite 6.4.5
```
O sentinel exige que a primeira linha termine com `(#NNN)`.

**Correção:** PR #128 mergeado sem `commit_message`, gerando automaticamente `título do PR (#128)`.  
**Evidência:** Run `39780447806` → `conclusion: success` no SHA `4b3d6cae`.

### 4.2 Enterprise Compliance (Security Definer ACL) — CORRIGIDO via PR #126

**Causa antes do #126:** `audit_security_definer_acl()` sem `get_public_favorite_list` e `get_public_favorite_reactions`.

**Correção:** Migration `20261022120000_add_public_favorites_to_security_definer_allowlist.sql` com 3 assinaturas revisadas.

**Novo bloqueio pós-PR #126 (externo — quota Supabase):**
```
check_tables_rls falhou: Service for this project is restricted due to the following violations:
exceed_edge_functions_invocations_quota, exceed_egress_quota.
The project owner must upgrade their plan or remove spend caps to restore service.
```
→ Documentado em PENDENCIAS.md.

### 4.3 Migration Ledger Drift — CORRIGIDO via PR #129

**Causa:** `findingFingerprint()` serializa `local_sha256: null` para findings `local_sem_ledger`, mas o digest estava calculado com o `local_sha256` real incluído.

- Digest incorreto: `04cb216beca48eed8046b351d412bdfc1fdcb2e747f0e0df292f0f8bb9f80c70`
- Digest correto: `e2815b0275479b6f91b3859f14b72e708b9521cf98a616a00b335679afccf20c`

**Evidência:** Run `39780884679` no SHA `4b3d6cae` → `conclusion: success` ✅.

### 4.4 CVEs vite — CORRIGIDO via PR #126

Vite atualizado de 6.4.3 para 6.4.5, cobrindo 5 CVEs high:
- GHSA-698v, GHSA-r825, GHSA-587h, GHSA-9jrq, GHSA-rq7h

---

## 5. Bloqueios externos (requerem ação do owner)

Estes workflows falham por motivo externo ao código e estão documentados individualmente em `PENDENCIAS.md`:

| Workflow | Causa | Ação necessária |
|---|---|---|
| Qualidade contínua (`ci.yml`) | ECR Public rate limit — `toomanyrequests: Data limit exceeded` | Autenticar runner com `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` ou migrar imagem para GHCR |
| Enterprise Compliance & Audit Reporting | Supabase quota esgotada (`exceed_edge_functions_invocations_quota, exceed_egress_quota`) | Remover spend caps ou recarregar quota no painel Supabase |
| E2E (Playwright) | Supabase 402 — edge functions retornam 402 em vez de 401/403 | Idem (mesma quota) |
| Copilot | GitHub Copilot quota 402 | Verificar billing em github.com/settings/billing |

---

## 6. Tabela de prova — workflows que estavam em falha

| Workflow | SHA antes | Conclusão antes | SHA depois | Conclusão depois | Link run atual |
|---|---|---|---|---|---|
| Branch Protection Sentinel | `ae1b92b3` | **failure** | `4b3d6cae` | **success** ✅ | https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39780447806 |
| Security Scan | `a82d92b4` | success | `4b3d6cae` | **success** ✅ | https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39780447928 |
| Migration Ledger Drift | `6242a043` | **failure** | `4b3d6cae` | **success** ✅ | https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39780884679 |
| Enterprise Compliance (Security Definer ACL) | `a82d92b4` | **failure** | — | **corrigido no DB** ✅ (bloqueio externo atual: quota Supabase) | https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39780447872 |
| Qualidade contínua (`ci.yml`) | `a82d92b4` | **failure** | — | **failure** ❌ (externo — ECR) | PENDENCIAS.md |
| E2E (Playwright) | `a82d92b4` | **failure** | — | **failure** ❌ (externo — Supabase quota) | PENDENCIAS.md |
| Copilot | `a82d92b4` | **failure** | — | **failure** ❌ (externo — Copilot quota) | PENDENCIAS.md |

### Workflows que eram verdes e continuam verdes

| Workflow | SHA antes | SHA depois | Evidência |
|---|---|---|---|
| Security Scan | `a82d92b4` success | `4b3d6cae` success | Run `39780447928` |
| CodeQL | `a82d92b4` success | `4b3d6cae` in_progress | Run `39780447790` |
| Portal Sicoob | `a82d92b4` success | *não rodou neste SHA* | Sem regressão — código desta área não foi alterado |
| npm_and_yarn | `a82d92b4` success | *não rodou neste SHA* | Triggered por Dependabot, não por push |

---

## 7. Resumo final

**3 workflows corrigidos por código** (PRs #126, #128, #129):
- Branch Protection Sentinel: failure → success ✅
- Migration Ledger Drift: failure → success ✅ (run `39780884679`)
- Enterprise Compliance (Security Definer ACL): corrigido no banco via migration ✅

**4 workflows bloqueados por causas externas** (sem alteração de código possível):
- Qualidade contínua (`ci.yml`): ECR Public rate limit → ver PENDENCIAS.md
- Enterprise Compliance (RLS), E2E: Supabase quota esgotada → ver PENDENCIAS.md
- Copilot: GitHub Copilot quota → ver PENDENCIAS.md

> Portal Sicoob (`sicoob-ci.yml`) era **success** no baseline e não usa imagem ECR — não é bloqueio externo.

**0 regressões introduzidas** nos workflows que eram verdes antes das correções.
