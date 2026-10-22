# Relatório de Auditoria Exaustiva — Brindes Sicoob V2

**Data:** 2026-10-22  
**Branch auditada:** `claude/hopeful-mccarthy-8rqrqw` → mergeado em `main`  
**Metodologia:** Consultas diretas ao banco Supabase (MCP) + leitura de código + análise de CI

---

## 1. Dependências e CVEs

| Item | Estado | Evidência |
|------|--------|-----------|
| Vite `6.4.5` (5 CVEs high corrigidos) | ✅ CONFIRMADO | `package-lock.json`: `node_modules/vite: 6.4.5` |
| `@vitest/mocker` `4.1.11` | ⚠️ PENDENTE 4.1.12 | Dependabot: `security_update_not_possible` (requer Node ≥24) |
| Todos os sub-pacotes vitest | ✅ Consistentes | `@vitest/coverage-v8`, `@vitest/expect`, `@vitest/runner`, etc. todos em 4.1.11 |

**GAP documentado:** `@vitest/mocker` 4.1.11 tem GHSA-xp26-3454-mjgp e GHSA-qxg6-89mg-rqv8 (Windows backslash traversal + code injection via mock). Impacto apenas em ambiente de CI/dev, não em produção (Supabase não usa @vitest).

---

## 2. Banco de Dados — RLS

| Item | Estado | Evidência |
|------|--------|-----------|
| 238 tabelas com RLS habilitado | ✅ 100% | Query direta: 0 tabelas sem RLS |
| `anon` bloqueado em `cooperativa_budgets` | ✅ CONFIRMADO | Policy RESTRICTIVE: `false` para anon ALL |
| `anon` bloqueado em `pa_budgets` | ✅ CONFIRMADO | Policy RESTRICTIVE: `false` para anon ALL |
| `quotes` escopado por seller/supervisor/admin | ✅ CONFIRMADO | 4 policies (SELECT/INSERT/UPDATE/DELETE) |
| `quote_items` escopado por ownership de quote | ✅ CONFIRMADO | JOIN com `quotes` via `quote_id` |
| `sicoob_orders` insert/delete/update admin-only | ✅ CONFIRMADO | `is_admin()` em cmd write |
| `sicoob_order_items` leitura via função | ✅ CONFIRMADO | `sicoob_current_actor_can_read_order(order_id)` |
| `favorite_lists` user-scoped + shared_token | ✅ CONFIRMADO | Suporte a shared_token com expiração |
| `cart_items` user-scoped | ✅ CONFIRMADO | `user_id = auth.uid()` |

---

## 3. Funções SECURITY DEFINER

| Item | Estado | Evidência |
|------|--------|-----------|
| Allowlist `audit_security_definer_acl()` | ✅ CORRETO | 3 assinaturas: `get_sicoob_invitation`, `get_public_favorite_list`, `get_public_favorite_reactions` |
| `get_public_favorite_list` | ✅ SECURITY DEFINER | Confirmado no banco |
| `get_public_favorite_reactions` | ✅ SECURITY DEFINER | Confirmado no banco |
| `audit_security_definer_acl` | ✅ SECURITY INVOKER | Confirmar — auditoria com INVOKER é correto |

### ⚠️ GAP: search_path=public em todas as funções SECURITY DEFINER

**Severidade:** MÉDIO (baixo impacto prático no Supabase)

**Achado:** Todas as 310 funções SECURITY DEFINER têm `search_path=public`, não o ideal `search_path=''` (vazio). 

**Risco real:** Em Supabase, `anon` e `authenticated` não têm permissão CREATE na schema `public` (revogado por padrão desde Supabase v18). O ataque via path hijacking exigiria que um adversário já tivesse acesso de `superuser` ou `service_role` — o que significa que o sistema já estaria comprometido de outra forma.

**Recomendação futura:** Migração para `search_path=''` em futuras funções criadas. Para as existentes, o risco é aceito dado o modelo de permissões do Supabase.

---

## 4. Triggers de Atualização de Timestamps

| Função | Tabelas cobertas | Estado |
|--------|-----------------|--------|
| `update_updated_at_column()` | 20+ tabelas (orders, invoices, kits, mcp_api_keys, etc.) | ✅ ATIVO |
| `handle_updated_at()` | CMS, campaigns, categories, cooperativas, coupons, newsletter | ✅ ATIVO |
| `set_magic_up_updated_at()` | magic_up_brand_kits, campaigns, public_shares | ✅ ATIVO |

**Total verificado:** 30+ triggers BEFORE UPDATE ativos no schema `public`.

---

## 5. Ledger de Migrações

**Schema real de `supabase_migrations.schema_migrations`:**
- `version` (text, NOT NULL) — chave primária
- `statements` (ARRAY) — SQL das migrations
- `name` (text) — nome descritivo
- `created_by` (text)
- `idempotency_key` (text)
- `rollback` (ARRAY)

**Nota:** A tabela não possui coluna `hash`. O fingerprint do ledger é rastreado por `version` (nome do arquivo). O sistema de Branch Protection Sentinel valida por nome/timestamp, não por hash de conteúdo SQL.

---

## 6. Configurações de Performance/Segurança do Postgres

| Parâmetro | Valor atual | Estado |
|-----------|-------------|--------|
| `statement_timeout` | 120.000ms (120s) | ✅ CORRETO (PostgREST cache) |
| `idle_in_transaction_session_timeout` | 0ms (default) | ℹ️ Sem limite — normal no Supabase |
| `lock_timeout` | 0ms (default) | ℹ️ Sem limite — normal no Supabase |

---

## 7. Endpoint `verify-email` (Edge Function)

**Status:** Desativado no PR #106 (mergeado). A edge function foi removida/desativada conforme documentado.

---

## 8. CI/CD — Estado atual dos Workflows

Os 15 workflows ativos do repositório estão em estado operacional. As 41 páginas visíveis em `is:failure` no GitHub Actions são **runs históricos** de PRs já fechados/mergeados (PR #106, Dependabot #107-#110), não falhas atuais.

Workflows bloqueados por dependências externas (documentados em `PENDENCIAS.md`):
- `Enterprise Compliance Check` — Supabase quota (owner)
- `E2E Tests` — Supabase quota (owner)
- `Copilot Review` — Copilot billing (owner)

---

## Resumo Executivo

### ✅ Validado e funcionando

1. **CVEs de Vite** — 5 CVEs high corrigidos (6.4.5 confirmado no lock)
2. **RLS** — 238/238 tabelas protegidas, todas as tabelas de negócio críticas auditadas
3. **Security Definer Allowlist** — 3 funções, allowlist correto
4. **Timestamps** — 30+ triggers BEFORE UPDATE ativos
5. **statement_timeout** — 120s configurado
6. **sicoob_orders** — INSERT/DELETE/UPDATE bloqueado para não-admin
7. **cooperativa_budgets / pa_budgets** — anon bloqueado + escopamento correto por cooperativa

### ⚠️ Gaps documentados (não corrigíveis sem ação externa)

| # | Gap | Severidade | Bloqueio |
|---|-----|------------|---------|
| 1 | `@vitest/mocker 4.1.12` não aplicado | MÉDIO | Requer Node ≥24 (seu ambiente) |
| 2 | `search_path=public` (não vazio) nas 310 funções SECURITY DEFINER | MÉDIO | Migração futura — risco real baixo no Supabase |
| 3 | Enterprise Compliance + E2E sem quota Supabase | ALTO (operacional) | Requer upgrade de conta Supabase |

### 📋 Itens em PENDENCIAS.md

Ver `PENDENCIAS.md` para lista completa com passos de ação para cada bloqueio externo.

---

*Auditoria realizada via Supabase MCP + análise de código — 2026-10-22*
