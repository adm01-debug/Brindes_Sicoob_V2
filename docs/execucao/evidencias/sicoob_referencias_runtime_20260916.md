# Etapa 26 — referências de runtime a objetos inexistentes

**Método:** extraídas 185 tabelas + 92 RPCs distintas referenciadas em `src/` e
`supabase/functions/` via `.from('...')`/`.rpc('...')`, comparadas contra o
inventário ao vivo do banco `cfmzkthhgliqelozlmwu`. 30 nomes não bateram à
primeira vista; 20 se confirmaram falso-positivo (client separado para
catálogo/CRM externos, ou chamada `.storage.from()` quebrada em 2 linhas que
o grep não capturou corretamente). Sobraram **10 achados reais**.

## Falsos-positivos resolvidos (não precisam de ação)
`categories`, `categories_tree_visual`, `companies`, `contacts`, `customers`,
`material_groups`, `material_types`, `mv_material_group_stats`,
`product_materials`, `product_category_assignments`, `suppliers`,
`tabela_preco_gravacao_oficial`, `tabela_preco_gravacao_oficial_faixa`,
`products` (nas Edge Functions) — todas usam `createClient()` com
`EXTERNAL_SUPABASE_URL`/`EXTERNAL_CRM_URL` explícitos, banco diferente do
auditado aqui. `proposals` (PdfGenerationDialog.tsx) e `personalization`
(OrderService.ts) — chamadas `.storage.from(...)` genuínas, quebradas em 2
linhas, sem bug real.

## Já corrigidos nesta sessão (Etapa 25)
`art-files` → código trocado para `.storage.from('proposals')` (2 arquivos);
`avatars` → bucket criado com policies.

## Achados reais pendentes de decisão (não corrigidos nesta sessão)

| Referência | Arquivo | Alcançável? | Achado | Recomendação |
|---|---|---|---|---|
| `sicoob_budgets` | `src/services/sicoob/budgetService.ts`, `src/pages/sicoob/PAWalletPage.tsx`, `src/hooks/sicoob/useSicoobBudget.ts` | **Não** — `PAWalletPage` não está roteada em nenhum lugar do app | Modelo antigo (`pa_id` + `used_amount` único) foi substituído por `pa_budgets`/`cooperativa_budgets` (por ano/mês, `verba_total`/`verba_consumida`). Não é um rename simples — o formato mudou. | Decisão de produto: reescrever contra `pa_budgets` ou remover a página morta |
| `roles` | `src/pages/RolesPage.tsx` | **Não** — não roteada | Página inteira órfã, provavelmente superada por `role_permissions`/`user_roles` | Remover o arquivo (código morto confirmado) |
| `bitrix_clients`, `bitrix_deals`, `bitrix_sync_logs` | `supabase/functions/bitrix-sync/index.ts`, `src/pages/QuotesKanbanPage.tsx` | Não verificado se `QuotesKanbanPage` está roteada | Cliente aponta para o projeto principal (não externo), tabelas realmente não existem | Verificar se a função é chamada em produção; se sim, criar as 3 tabelas ou apontar para as existentes de sync/CRM |
| `rls_denial_logs` (plural) | `src/pages/admin/AuditEvidenceDashboard.tsx` | Não verificado | Tabela real é `rls_denial_log` (singular) — parece erro de digitação | Corrigir para singular (fix de 1 linha, baixo risco) |
| `audit_log` | `src/hooks/admin/useAuditLog.ts` | Não verificado | Sem tabela `audit_log`; existe `admin_audit_log` | Provável rename incompleto — verificar se deveria apontar para `admin_audit_log` |
| `error_logs` | `src/lib/error-reporter.ts` | Sim, é utilitário global | Código já usa `as any` (sabe que o tipo não bate) e trata falha como warning não-fatal — não quebra a UI, só perde telemetria de erro | Criar tabela `error_logs` ou redirecionar para `admin_audit_log` (comentário no próprio código já cogita isso) |
| `password_reset_requests` | `src/hooks/usePasswordResetRequests.ts` | Não verificado | — | Verificar alcançabilidade antes de decidir |
| `personalization_simulations` | `src/hooks/useSimulation.ts` | Não verificado | — | Verificar alcançabilidade antes de decidir |
| `personalization_techniques` | `src/components/admin/MockupPromptManager.tsx` | Não verificado | — | Verificar alcançabilidade antes de decidir |
| `sales_goals` | `src/hooks/useSalesGoals.ts` | Não verificado | — | Verificar alcançabilidade antes de decidir |
| `user_2fa_settings` | `src/hooks/use2FA.ts` | Não verificado | Funcionalidade de segurança (2FA) — se alcançável, prioridade alta | Verificar alcançabilidade **antes de qualquer outra etapa de segurança** |

**Não fechado como 0 órfãos** — este documento é a tabela de decisões que a
Etapa 26 pede, mas falta: (a) confirmar alcançabilidade dos 6 itens
"não verificado", (b) decidir e aplicar a correção de cada um, (c) o script
`scripts/db/check-runtime-refs.mjs` versionado no CI (não escrito).
