# CHANGELOG do snapshot Supabase

Diff semântico gerado a cada coleta em que algo mudou.

## 2026-11-25 13:19 UTC

- **functions** alterado (1): `public.cleanup_old_notifications()`

## 2026-11-25 11:18 UTC

- **colunas** adicionado (10): `public.push_subscriptions.auth`, `public.push_subscriptions.created_at`, `public.push_subscriptions.device_type`, `public.push_subscriptions.endpoint`, `public.push_subscriptions.id`, `public.push_subscriptions.is_active`, `public.push_subscriptions.last_used_at`, `public.push_subscriptions.p256dh`, `public.push_subscriptions.user_agent`, `public.push_subscriptions.user_id`
- **constraints** adicionado (3): `public.push_subscriptions.push_subscriptions_pkey`, `public.push_subscriptions.push_subscriptions_user_id_fkey`, `public.push_subscriptions.unique_subscription`
- **functions** adicionado (1): `public.is_dnd_active(p_user_id uuid)`
- **functions** alterado (4): `public.cleanup_old_notifications()`, `public.get_unread_count()`, `public.mark_all_notifications_read()`, `public.mark_notification_read(p_notification_id uuid)`
- **indexes** adicionado (4): `public.idx_push_subscriptions_active`, `public.idx_push_subscriptions_user`, `public.push_subscriptions_pkey`, `public.unique_subscription`
- **lints** adicionado (8): `policy_auth_fn_not_wrapped:public.push_subscriptions.Users can manage own subscriptions`, `rpc_anon_executable:public.cleanup_old_notifications()`, `rpc_anon_executable:public.is_dnd_active(p_user_id uuid)`, `secdef_mutable_search_path:public.cleanup_old_notifications()`, `secdef_mutable_search_path:public.get_unread_count()`, `secdef_mutable_search_path:public.is_dnd_active(p_user_id uuid)`, `secdef_mutable_search_path:public.mark_all_notifications_read()`, `secdef_mutable_search_path:public.mark_notification_read(p_notification_id uuid)`
- **migrations** adicionado (3): `000_notification_functions_replay_guard`, `004_notification_functions`, `005_push_subscriptions`
- **policies (RLS)** adicionado (1): `public.push_subscriptions.Users can manage own subscriptions`
- **tabelas** adicionado (1): `public.push_subscriptions`

## 2026-11-25 00:38 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_28`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_21`

## 2026-11-24 18:19 UTC

- **functions** alterado (8): `public.audit_security_definer_acl()`, `public.tg_pa_budget_entries_competencia_aberta()`, `public.tg_pa_budget_entries_immutable()`, `public.tg_recalc_pa_budget_states()`, `public.tg_set_order_cost_center()`, `public.tg_sicoob_order_budget_after_insert()`, `public.tg_sync_pa_budget_planejada()`, `public.tg_validate_order_allocations()`
- **migrations** adicionado (1): `20261124142500_revoke_execute_pa_budget_triggers`

## 2026-11-24 00:34 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_27`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_20`

## 2026-11-23 22:16 UTC

- **colunas** adicionado (34): `public.cost_centers.ativo`, `public.cost_centers.codigo`, `public.cost_centers.cooperativa_id`, `public.cost_centers.created_at`, `public.cost_centers.id`, `public.cost_centers.nome`, `public.cost_centers.observacoes`, `public.cost_centers.updated_at`, `public.pa_budget_allocations.cost_center_id`, `public.pa_budget_allocations.created_at`, `public.pa_budget_allocations.id`, `public.pa_budget_allocations.order_id`, `public.pa_budget_allocations.percentual`, `public.pa_budget_allocations.valor`, `public.pa_budget_entries.actor_id`, `public.pa_budget_entries.competencia_ano`, `public.pa_budget_entries.competencia_mes`, `public.pa_budget_entries.cost_center_id`, `public.pa_budget_entries.created_at`, `public.pa_budget_entries.estado`, `public.pa_budget_entries.id`, `public.pa_budget_entries.motivo`, `public.pa_budget_entries.order_id`, `public.pa_budget_entries.pa_budget_id`, `public.pa_budget_entries.pa_id`, `public.pa_budget_entries.tipo`, `public.pa_budget_entries.valor`, `public.pa_budgets.cost_center_id`, `public.pa_budgets.fechada_em`, `public.pa_budgets.fechada_por`, `public.pa_budgets.verba_comprometida`, `public.pa_budgets.verba_planejada`, `public.pa_budgets.verba_reservada`, `public.sicoob_orders.cost_center_id`
- **constraints** adicionado (24): `public.cost_centers.cost_centers_codigo_nao_vazio`, `public.cost_centers.cost_centers_coop_codigo_uk`, `public.cost_centers.cost_centers_cooperativa_id_fkey`, `public.cost_centers.cost_centers_pkey`, `public.pa_budget_allocations.pa_budget_allocations_cost_center_id_fkey`, `public.pa_budget_allocations.pa_budget_allocations_order_cc_uk`, `public.pa_budget_allocations.pa_budget_allocations_order_id_fkey`, `public.pa_budget_allocations.pa_budget_allocations_percentual_check`, `public.pa_budget_allocations.pa_budget_allocations_pkey`, `public.pa_budget_allocations.pa_budget_allocations_valor_check`, `public.pa_budget_entries.pa_budget_entries_actor_id_fkey`, `public.pa_budget_entries.pa_budget_entries_competencia_valida`, `public.pa_budget_entries.pa_budget_entries_cost_center_id_fkey`, `public.pa_budget_entries.pa_budget_entries_estado_valido`, `public.pa_budget_entries.pa_budget_entries_order_id_fkey`, `public.pa_budget_entries.pa_budget_entries_pa_budget_id_fkey`, `public.pa_budget_entries.pa_budget_entries_pa_id_fkey`, `public.pa_budget_entries.pa_budget_entries_pkey`, `public.pa_budget_entries.pa_budget_entries_tipo_valido`, `public.pa_budget_entries.pa_budget_entries_valor_nao_zero`, `public.pa_budgets.pa_budgets_cost_center_id_fkey`, `public.pa_budgets.pa_budgets_estados_nao_negativos`, `public.pa_budgets.pa_budgets_fechada_por_fkey`, `public.sicoob_orders.sicoob_orders_cost_center_id_fkey`
- **functions** adicionado (21): `public.notify_singular_quote_decision()`, `public.pa_budget_allocation_write_ok(p_order_id uuid)`, `public.pa_budget_apply_state(p_order_id uuid, p_total numeric, p_cost_center_id uuid, p_para_estado text, p_motivo text, p_pa_id uuid, p_created_at timestamp with time zone)`, `public.pa_budget_close_competence(p_pa_id uuid, p_ano integer, p_mes integer, p_fechar boolean)`, `public.pa_budget_entry_scope_ok(p_budget_id uuid, p_pa_id uuid, p_ano integer, p_mes integer)`, `public.pa_budget_estado_do_status(p_status text)`, `public.pa_budget_id_for_order(p_order_id uuid)`, `public.pa_budget_move_order(p_order_id uuid, p_para_estado text, p_motivo text)`, `public.pa_budget_reconcile(p_pa_id uuid, p_ano integer, p_mes integer)`, `public.pa_budget_replace_allocations(p_order_id uuid, p_rows jsonb)`, `public.pa_budget_validate_allocations(p_order_id uuid, p_total numeric, p_status text, p_estrito boolean)`, `public.tg_pa_budget_entries_competencia_aberta()`, `public.tg_pa_budget_entries_immutable()`, `public.tg_recalc_pa_budget_states()`, `public.tg_set_order_cost_center()`, `public.tg_sicoob_order_budget_after_insert()`, `public.tg_sync_pa_budget_planejada()`, `public.tg_validate_order_allocations()`, `public.user_can_access_cooperativa(p_cooperativa_id uuid)`, `public.user_can_access_pa(p_pa_id uuid)`, `public.user_is_comprador_singular(p_user_id uuid)`
- **functions** alterado (6): `public.current_user_cooperativa_id()`, `public.current_user_pa_id()`, `public.is_admin(_user_id uuid)`, `public.is_gestor_compras(_user_id uuid)`, `public.sicoob_current_actor_can_read_order(p_order_id uuid)`, `public.validate_sicoob_order_budget()`
- **indexes** adicionado (13): `public.cost_centers_coop_codigo_uk`, `public.cost_centers_pkey`, `public.idx_cost_centers_coop`, `public.idx_pa_budgets_cost_center`, `public.idx_pba_cost_center`, `public.idx_pba_order`, `public.idx_pbe_budget`, `public.idx_pbe_competencia`, `public.idx_pbe_estado`, `public.idx_pbe_order`, `public.pa_budget_allocations_order_cc_uk`, `public.pa_budget_allocations_pkey`, `public.pa_budget_entries_pkey`
- **lints** adicionado (5): `fk_without_index:public.pa_budget_entries.pa_budget_entries_actor_id_fkey`, `fk_without_index:public.pa_budget_entries.pa_budget_entries_cost_center_id_fkey`, `fk_without_index:public.pa_budget_entries.pa_budget_entries_pa_id_fkey`, `fk_without_index:public.pa_budgets.pa_budgets_fechada_por_fkey`, `fk_without_index:public.sicoob_orders.sicoob_orders_cost_center_id_fkey`
- **migrations** adicionado (2): `20261122120000_pa_budget_full_lifecycle`, `20261123090000_notify_singular_quote_decision`
- **policies (RLS)** adicionado (8): `public.cost_centers.cost_centers_select`, `public.cost_centers.cost_centers_write`, `public.pa_budget_allocations.pa_budget_allocations_delete`, `public.pa_budget_allocations.pa_budget_allocations_insert`, `public.pa_budget_allocations.pa_budget_allocations_select`, `public.pa_budget_allocations.pa_budget_allocations_update`, `public.pa_budget_entries.pa_budget_entries_insert`, `public.pa_budget_entries.pa_budget_entries_select`
- **tabelas** adicionado (3): `public.cost_centers`, `public.pa_budget_allocations`, `public.pa_budget_entries`
- **triggers** adicionado (8): `public.pa_budget_allocations.trg_validate_order_allocations`, `public.pa_budget_entries.trg_pa_budget_entries_competencia`, `public.pa_budget_entries.trg_pa_budget_entries_imutavel`, `public.pa_budget_entries.trg_recalc_pa_budget_states`, `public.pa_budgets.trg_sync_pa_budget_planejada`, `public.quotes.trg_notify_singular_quote_decision`, `public.sicoob_orders.trg_set_order_cost_center`, `public.sicoob_orders.trg_validate_sicoob_order_budget_ins`

## 2026-11-23 21:15 UTC

- **functions** alterado (1): `public.check_rate_limit(_identifier text, _endpoint text, _max_requests integer, _window_seconds integer, _block_duration_seconds integer)`

## 2026-11-23 11:18 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_26`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_19`

## 2026-11-22 20:16 UTC

- **functions** alterado (1): `public.validate_scheduled_report_email()`

## 2026-11-22 15:14 UTC

- **realtime** removido (3): `supabase_realtime_messages_publication:realtime.messages_2026_11_16`, `supabase_realtime_messages_publication:realtime.messages_2026_11_17`, `supabase_realtime_messages_publication:realtime.messages_2026_11_18`

## 2026-11-22 12:21 UTC

- **realtime** adicionado (3): `supabase_realtime_messages_publication:realtime.messages_2026_11_23`, `supabase_realtime_messages_publication:realtime.messages_2026_11_24`, `supabase_realtime_messages_publication:realtime.messages_2026_11_25`

## 2026-11-19 22:16 UTC

- **lints** removido (2): `rls_no_policies:public._backup_custom_kits_pinned_20261118`, `rls_no_policies:public.webhook_retry_claims`
- **migrations** adicionado (1): `20261119140000_fix_compliance_rls_scan`
- **policies (RLS)** adicionado (2): `public._backup_custom_kits_pinned_20261118.deny_non_service_role`, `public.webhook_retry_claims.deny_non_service_role`

## 2026-11-19 18:20 UTC

- **functions** alterado (1): `public.audit_empty_rls_policies()`

## 2026-11-19 16:18 UTC

- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_15`

## 2026-11-19 15:17 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_22`

## 2026-11-19 03:19 UTC

- **functions** alterado (1): `public.register_quote_price_attestation(p_actor_id uuid, p_quote_id uuid, p_expected_row_version integer, p_quote jsonb, p_items jsonb, p_history jsonb)`

## 2026-11-19 01:13 UTC

- **colunas** adicionado (9): `private.quote_price_attestations.actor_id`, `private.quote_price_attestations.consumed_at`, `private.quote_price_attestations.consumed_transaction_id`, `private.quote_price_attestations.created_at`, `private.quote_price_attestations.expected_row_version`, `private.quote_price_attestations.expires_at`, `private.quote_price_attestations.id`, `private.quote_price_attestations.payload_hash`, `private.quote_price_attestations.quote_id`
- **constraints** adicionado (4): `private.quote_price_attestations.quote_price_attestations_consumption_check`, `private.quote_price_attestations.quote_price_attestations_payload_hash_check`, `private.quote_price_attestations.quote_price_attestations_pkey`, `private.quote_price_attestations.quote_price_attestations_version_check`
- **functions** adicionado (7): `private.quote_price_payload_hash(p_quote jsonb, p_items jsonb, p_history jsonb)`, `public.consume_quote_price_attestation(p_attestation_id uuid, p_actor_id uuid, p_quote_id uuid, p_expected_row_version integer, p_quote jsonb, p_items jsonb, p_history jsonb)`, `public.get_quote_save_idempotent_replay(p_idempotency_key uuid, p_quote jsonb, p_items jsonb, p_history jsonb)`, `public.guard_quote_price_attestation()`, `public.register_quote_price_attestation(p_actor_id uuid, p_quote_id uuid, p_expected_row_version integer, p_quote jsonb, p_items jsonb, p_history jsonb)`, `public.save_quote_atomic_attested(p_quote jsonb, p_items jsonb, p_quote_id uuid, p_expected_row_version integer, p_history jsonb)`, `public.save_quote_atomic_idempotent_attested(p_quote jsonb, p_items jsonb, p_idempotency_key uuid, p_history jsonb)`
- **functions** alterado (2): `public.save_quote_atomic(p_quote jsonb, p_items jsonb, p_quote_id uuid, p_expected_row_version integer, p_history jsonb)`, `public.save_quote_atomic_idempotent(p_quote jsonb, p_items jsonb, p_idempotency_key uuid, p_history jsonb)`
- **indexes** adicionado (2): `private.quote_price_attestations_expiration_idx`, `private.quote_price_attestations_pkey`
- **migrations** adicionado (1): `20261117092000_quote_price_attestation_gate`
- **tabelas** adicionado (1): `private.quote_price_attestations`
- **triggers** adicionado (3): `public.quote_item_personalizations.zzz_guard_quote_personalization_price_attestation`, `public.quote_items.zzz_guard_quote_item_price_attestation`, `public.quotes.zzz_guard_quote_price_attestation`

## 2026-11-18 23:15 UTC

- **functions** alterado (2): `public.save_quote_atomic(p_quote jsonb, p_items jsonb, p_quote_id uuid, p_expected_row_version integer, p_history jsonb)`, `public.save_quote_atomic_idempotent(p_quote jsonb, p_items jsonb, p_idempotency_key uuid, p_history jsonb)`

## 2026-11-18 18:19 UTC

- **functions** adicionado (1): `public.connections_auto_test_interval_from_schedule(p_schedule text)`
- **functions** alterado (1): `public.get_connections_auto_test_interval()`
- **migrations** adicionado (1): `20261118150000_fix_connections_auto_test_interval_hourly`

## 2026-11-18 16:17 UTC

- Snapshot inicial.

