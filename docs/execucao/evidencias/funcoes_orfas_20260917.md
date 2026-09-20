# Funções órfãs (banco → código) — 17/09/2026

Origem: Etapa 27 do `docs/plano-implementacao/plano-correcoes-auditoria-50-etapas-20260917.md`. 243 funções em `public`. Exclusão em 3 passos, cada um com evidência verificável:

1. **125 funções chamadas via `.rpc('nome')`** no client interno (`grep -rohE` em `src/`+`supabase/functions/`).
2. **~132 funções `returns trigger`** — invocadas pelo mecanismo de trigger, não por client; não são órfãs por definição, mesmo sem chamada explícita.
3. **12 funções agendadas via `pg_cron`** (`select jobname, command from cron.job`).

Sobraram **77 candidatas**. Para cada uma, medi via SQL (`pg_get_functiondef` de todas as outras funções `ilike '%nome(%'`, e `pg_policies.qual`/`with_check` `ilike '%nome(%'`) se é chamada por **outra função** (`callers`) ou usada dentro de **policy RLS** (`policy_uses`). 34 das 77 têm pelo menos um dos dois > 0 — não são órfãs, são chamadas indiretamente (de dentro de outra `SECURITY DEFINER` ou de dentro de uma policy). As **43 restantes** têm `callers=0` e `policy_uses=0` — não achei NENHUM caminho de chamada para elas nesta rodada.

**Ressalva explícita:** a classificação "ops-tool manual" vs. "genuinamente-órfã" abaixo é por **nome**, não por uso verificado — não consultei se alguém invoca essas funções manualmente via MCP/SQL Editor fora do código versionado (isso não deixa rastro em `pg_proc`/`pg_policies`). Tratem como ponto de partida pra revisão humana, não como veredito.

## Tipo 1 — chamada indireta confirmada (34) — NÃO são órfãs

| Função | callers (função→função) | policy_uses |
|---|---|---|
| `is_admin` | 0 | 75 |
| `get_user_org_ids` | 0 | 19 |
| `is_order_owner_or_admin` | 0 | 13 |
| `can_view_all_sales` | 0 | 33 |
| `is_supervisor_or_above` | 3 | 8 |
| `current_user_cooperativa_id` | 0 | 7 |
| `is_gestor_compras` | 0 | 7 |
| `sicoob_actor_can_manage_consolidation` | 6 | 1 |
| `is_kit_owner` | 0 | 6 |
| `assert_sicoob_approval_actor` | 5 | 0 |
| `get_sicoob_order_approval_policy` | 5 | 0 |
| `has_org_role` | 0 | 4 |
| `sicoob_actor_can_manage_fulfillment` | 4 | 0 |
| `sicoob_actor_can_view_all_consolidation` | 0 | 4 |
| `_can_act_on_behalf_of_others` | 3 | 0 |
| `is_admin_strict` | 3 | 5 |
| `current_user_pa_id` | 0 | 3 |
| `is_manager_or_admin` | 0 | 3 |
| `sicoob_actor_can_receive_destination` | 0 | 3 |
| `can_manage` | 0 | 2 |
| `can_manage_quotes` | 2 | 2 |
| `get_user_cooperative_id` | 0 | 2 |
| `get_user_pa_id` | 0 | 2 |
| `is_gerente_pa` | 0 | 2 |
| `is_kit_collaborator` | 0 | 2 |
| `sicoob_actor_can_manage_finance` | 2 | 0 |
| `sicoob_actor_can_request_approval` | 2 | 0 |
| `allocate_sicoob_consolidation_by_order_pa` | 1 | 0 |
| `audit_rls_coverage` | 1 | 0 |
| `can_approve_discount` | 0 | 1 |
| `check_mcp_abuse_threshold` | 1 | 0 |
| `mcp_audit_actor` | 1 | 0 |
| `sicoob_actor_can_approve` | 1 | 0 |
| `sicoob_actor_can_receive_consolidation` | 0 | 1 |

## Tipo 2 — candidatas a "ops-tool manual" (uso provável via MCP/SQL direto, não código) — 16

`audit_all_rls_compliance`, `audit_security_definer_acl`, `audit_sicoob_rls_policies`, `auto_block_extreme_offenders`, `auto_revoke_orphan_full_keys`, `check_migration_status`, `check_security_health`, `check_sicoob_access_matrix`, `check_tables_rls`, `e2e_cleanup_check_rate_limit`, `inspect_query_plan`, `notify_hardening_regression`, `provision_qa_accounts`, `retry_failed_webhook_deliveries`, `seed_discount_test_users`, `snapshot_hardening_status`

Padrão comum: nome com `audit_`/`check_`/`seed_`/`provision_`/`snapshot_`/`inspect_` — mesma categoria que `check_security_health`/`get_app_health_summary` (essas duas já confirmadas como painel de ops em uso, por comparação de contexto). Risco de remoção: baixo se realmente não usadas, mas confirmar com quem faz ops antes de dropar.

## CORREÇÃO (17/09/2026, Etapa 25 do plano de correções) — 2 falsos-positivos confirmados

`get_sicoob_order_shipment` e `upsert_sicoob_order_shipment` **NÃO são órfãs** — são chamadas de verdade, só que através da mesma indireção via wrapper (`const shipmentRpc = supabase.rpc as unknown as ShipmentRpc`) que já tinha escondido `create_quote_version_atomic` da varredura original. Cadeia real confirmada: `OrderLogisticsTab.tsx` → `useSicoobShipment`/`useUpdateSicoobShipment` (`src/hooks/sicoob/useSicoobFulfillment.ts`) → `sicoobFulfillmentService.getShipment`/`updateShipment` (`src/services/sicoob/fulfillmentService.ts:26,32`) → `shipmentRpc(...)`. Ambas as RPCs existem no banco (confirmado via `information_schema.routines`). Removidas da tabela abaixo — a contagem correta de "genuinamente-órfã" é **21**, não 23. `sicoob_order_shipments` (tabela) nunca apareceu na lista de tabelas órfãs (`orfaos_banco_20260917.md`) pelo mesmo motivo — acesso só via RPC `SECURITY DEFINER` é o padrão esperado, não um problema.

## Tipo 3 — candidatas a "genuinamente-órfã" (nome sugere lógica de negócio, não ferramenta) — 21

| Função | Observação |
|---|---|
| `check_budget_availability` | Contrato Sicoob (Fase 3 do plano principal) — checar se algum hook de orçamento deveria chamar e não chama |
| `create_organization_with_owner` | Feature de organização multi-usuário — checar se há UI de "criar organização" que deveria chamar |
| `generate_sicoob_performance_report` | Confirmado órfã de verdade (checado diretamente, sem indireção de wrapper) — ver `etapa25_rpcs_sicoob_nao_ligadas_20260917.md` |
| `get_client_seasonality` | Provável dashboard analítico nunca ligado |
| `get_industry_seasonality` | idem |
| `get_unread_count` | Contador de notificações não lidas — checar se o sino de notificação usa outro caminho (realtime?) em vez desta RPC |
| `get_user_role` | `has_role`/`is_admin` etc. são usados nas policies; esta RPC específica (retorna o papel) não é chamada — provável duplicidade de propósito |
| `get_user_singular_id` | Análogo a `get_user_pa_id`/`current_user_pa_id` (esses são usados); esta variante não |
| `get_webhook_delivery_summary` | Painel de webhook — checar se existe tela de monitoramento de entrega |
| `is_dnd_active` | "Do not disturb" — feature de notificação, checar se foi implementada no frontend |
| `is_org_member` | Par de `create_organization_with_owner` — mesma feature de organização, mesmo status |
| `is_seller_only` | Variante de checagem de papel não usada nas policies existentes |
| `is_singular_buyer_for_quote` | Checagem de papel específica de orçamento, não usada |
| `is_vendedor` / `is_vendedor_role` | Duas variantes de checagem de papel "vendedor", nenhuma usada — `is_seller_only` (acima) também não; sugere um conjunto inteiro de helpers de papel "vendedor" nunca ligados |
| `log_quote_action` | Trilha de auditoria de orçamento — `quote_audit_logs` (tabela) também está órfã (ver `orfaos_banco_20260917.md`); as duas provavelmente são a mesma feature de auditoria de orçamento nunca ligada |
| `mark_all_notifications_read` / `mark_notification_read` | Ações de UI de notificação — checar se o componente de notificações usa update direto em vez da RPC |
| `process_export_queue_v3` | Fila de exportação — `optimization_queue`/`export_jobs` existem; checar se este é o processador correto e por que não roda (nem via cron, nem via chamada) |
| `search_records_rerank` | Provável parte de busca semântica (`search_products_semantic` é usada) — variante não ligada |
| `send_notification` | Função central pra criar notificação — MUITO estranho estar em callers=0/policy_uses=0 dado que `notifications` (tabela) tem uso ativo; validar com mais cuidado, pode ser falso-positivo desta varredura (ex.: chamada via `supabase.functions.invoke` de uma edge function que dispara isso por outro caminho, não capturado aqui) |

## Próximo passo sugerido (não executado nesta rodada — fora do escopo desta etapa)

`log_quote_action`+`quote_audit_logs` formam um par schema+RPC prontos e nunca ligados ao frontend, mesmo padrão de `sicoob_performance_reports`/`sicoob_approval_policies` — ver `etapa25_rpcs_sicoob_nao_ligadas_20260917.md`. `get_sicoob_order_shipment`/`upsert_sicoob_order_shipment`/`sicoob_order_shipments` **não fazem mais parte desse grupo** — já estão ligados (ver correção acima).
