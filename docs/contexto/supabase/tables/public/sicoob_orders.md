# public.sicoob_orders

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | sim |
| replica identity | full |
| vem de extensão | não |
| usada por views | public.sicoob_budget_audit |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `cooperative_id` | `uuid` | sim |  |  |  |
| 3 | `pa_id` | `uuid` | sim |  |  |  |
| 4 | `created_by` | `uuid` | sim |  |  |  |
| 5 | `status` | `text` | não | `'draft'::text` |  |  |
| 6 | `total_amount` | `numeric(12,2)` | sim | `0` |  |  |
| 7 | `notes` | `text` | sim |  |  |  |
| 8 | `delivery_address` | `text` | sim |  |  |  |
| 9 | `tracking_code` | `text` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `approved_by` | `uuid` | sim |  |  |  |
| 13 | `approved_at` | `timestamp with time zone` | sim |  |  |  |
| 14 | `sla_deadline` | `timestamp with time zone` | sim |  |  |  |
| 15 | `sla_status` | `text` | sim | `'normal'::text` |  |  |
| 16 | `audit_remaining_budget` | `numeric(12,2)` | sim |  |  |  |
| 17 | `is_pilot_order` | `boolean` | sim | `false` |  |  |
| 18 | `consolidation_id` | `uuid` | sim |  |  |  |
| 19 | `order_number` | `text` | não | `('SIC-'::text \|\| upper("substring"((gen_random_uuid())::text, 1, 8)))` |  |  |
| 20 | `approval_policy_id` | `uuid` | sim |  |  |  |
| 21 | `approval_policy_version` | `text` | sim |  |  |  |
| 22 | `approval_policy_snapshot` | `jsonb` | sim |  |  | Fotografia imutável da política aplicada na primeira submissão do pedido. |
| 23 | `source_quote_id` | `uuid` | sim |  |  |  |
| 24 | `source_quote_snapshot` | `jsonb` | sim |  |  |  |
| 25 | `requires_artwork` | `boolean` | não | `false` |  |  |
| 26 | `merchandise_amount` | `numeric(14,2)` | não | `0` |  |  |
| 27 | `personalization_amount` | `numeric(14,2)` | não | `0` |  |  |
| 28 | `negotiation_markup_amount` | `numeric(14,2)` | não | `0` |  |  |
| 29 | `commercial_subtotal_amount` | `numeric(14,2)` | não | `0` |  |  |
| 30 | `discount_amount` | `numeric(14,2)` | não | `0` |  |  |
| 31 | `shipping_amount` | `numeric(14,2)` | não | `0` |  |  |
| 32 | `pricing_formula_version` | `text` | não | `'legacy-v0'::text` |  |  |
| 33 | `cost_center_id` | `uuid` | sim |  |  |  |
| 34 | `sla_closed_at` | `timestamp with time zone` | sim |  |  |  |
| 35 | `sla_closed_status` | `text` | sim |  |  |  |
| 36 | `sla_closed_outcome` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| check_positive_total | CHECK | `CHECK (total_amount >= 0::numeric)` |  |  | sim |
| sicoob_orders_approved_by_fkey | FOREIGN KEY | `FOREIGN KEY (approved_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| sicoob_orders_brl_v1_reconciled | CHECK | `CHECK (pricing_formula_version <> 'brl-v1'::text OR abs(commercial_subtotal_amount - (merchandise_amount + personalization_amount + negotiation_markup_amount)) <= 0.01 AND discount_amount <= commercial_subtotal_amount AND abs(total_amount - (commercial_subtotal_amount - discount_amount + shipping_amount)) <= 0.01)` |  |  | sim |
| sicoob_orders_commercial_components_nonnegative | CHECK | `CHECK (merchandise_amount >= 0::numeric AND personalization_amount >= 0::numeric AND negotiation_markup_amount >= 0::numeric AND commercial_subtotal_amount >= 0::numeric AND discount_amount >= 0::numeric AND shipping_amount >= 0::numeric)` |  |  | sim |
| sicoob_orders_consolidation_id_fkey | FOREIGN KEY | `FOREIGN KEY (consolidation_id) REFERENCES order_consolidations(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| sicoob_orders_cooperative_id_fkey | FOREIGN KEY | `FOREIGN KEY (cooperative_id) REFERENCES cooperativas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| sicoob_orders_cost_center_id_fkey | FOREIGN KEY | `FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| sicoob_orders_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| sicoob_orders_pa_id_fkey | FOREIGN KEY | `FOREIGN KEY (pa_id) REFERENCES postos_atendimento(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| sicoob_orders_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sicoob_orders_sla_closed_outcome_check | CHECK | `CHECK (sla_closed_outcome IS NULL OR (sla_closed_outcome = ANY (ARRAY['approved'::text, 'rejected'::text, 'escalated'::text, 'cancelled'::text])))` |  |  | sim |
| sicoob_orders_sla_status_check | CHECK | `CHECK (sla_status = ANY (ARRAY['normal'::text, 'warning'::text, 'critical'::text]))` |  |  | sim |
| sicoob_orders_source_quote_id_fkey | FOREIGN KEY | `FOREIGN KEY (source_quote_id) REFERENCES quotes(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.order_consolidation_orders | order_consolidation_orders_order_id_fkey | order_id | RESTRICT |
| public.pa_budget_allocations | pa_budget_allocations_order_id_fkey | order_id | CASCADE |
| public.pa_budget_entries | pa_budget_entries_order_id_fkey | order_id | SET NULL |
| public.quotes | quotes_reorder_source_order_id_fkey | reorder_source_order_id | RESTRICT |
| public.sicoob_approval_requests | sicoob_approval_requests_order_id_fkey | order_id | CASCADE |
| public.sicoob_document_registry | sicoob_document_registry_order_id_fkey | order_id | RESTRICT |
| public.sicoob_order_artwork_versions | sicoob_order_artwork_versions_order_id_fkey | order_id | RESTRICT |
| public.sicoob_order_history | sicoob_order_history_order_id_fkey | order_id | CASCADE |
| public.sicoob_order_invoices | sicoob_order_invoices_order_id_fkey | order_id | RESTRICT |
| public.sicoob_order_item_logs | sicoob_order_item_logs_order_id_fkey | order_id | CASCADE |
| public.sicoob_order_items | sicoob_order_items_order_id_fkey | order_id | CASCADE |
| public.sicoob_order_payments | sicoob_order_payments_order_id_fkey | order_id | RESTRICT |
| public.sicoob_order_shipments | sicoob_order_shipments_order_id_fkey | order_id | RESTRICT |
| public.sicoob_reorder_requests | sicoob_reorder_requests_source_order_id_fkey | source_order_id | RESTRICT |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_fk_sicoob_orders_approved_by_fkey | btree | approved_by | não | sim |  | `CREATE INDEX idx_fk_sicoob_orders_approved_by_fkey ON public.sicoob_orders USING btree (approved_by)` |
| idx_sicoob_orders_cooperative_id | btree | cooperative_id | não | sim |  | `CREATE INDEX idx_sicoob_orders_cooperative_id ON public.sicoob_orders USING btree (cooperative_id)` |
| idx_sicoob_orders_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_sicoob_orders_created_by ON public.sicoob_orders USING btree (created_by)` |
| idx_sicoob_orders_id_text | btree | id | não | sim |  | `CREATE INDEX idx_sicoob_orders_id_text ON public.sicoob_orders USING btree (id)` |
| idx_sicoob_orders_pa_id | btree | pa_id | não | sim |  | `CREATE INDEX idx_sicoob_orders_pa_id ON public.sicoob_orders USING btree (pa_id)` |
| idx_sicoob_orders_status | btree | status | não | sim |  | `CREATE INDEX idx_sicoob_orders_status ON public.sicoob_orders USING btree (status)` |
| sicoob_orders_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sicoob_orders_pkey ON public.sicoob_orders USING btree (id)` |
| ux_sicoob_orders_one_consolidation | btree | consolidation_id, id | sim | sim | `(consolidation_id IS NOT NULL)` | `CREATE UNIQUE INDEX ux_sicoob_orders_one_consolidation ON public.sicoob_orders USING btree (consolidation_id, id) WHERE (consolidation_id IS NOT NULL)` |
| ux_sicoob_orders_order_number | btree | order_number | sim | sim |  | `CREATE UNIQUE INDEX ux_sicoob_orders_order_number ON public.sicoob_orders USING btree (order_number)` |
| ux_sicoob_orders_source_quote | btree | source_quote_id | sim | sim | `(source_quote_id IS NOT NULL)` | `CREATE UNIQUE INDEX ux_sicoob_orders_source_quote ON public.sicoob_orders USING btree (source_quote_id) WHERE (source_quote_id IS NOT NULL)` |


## Policies (RLS)

### `sicoob_merged_4b8a6190fe2a2a89_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND sicoob_current_actor_can_read_order(id)))` |
| WITH CHECK |  |

### `sicoob_merged_9fd7ad12dd4e4e82_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid)))` |

### `sicoob_merged_f3b5df66df8754c3_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid)))` |
| WITH CHECK |  |

### `sicoob_merged_fd58e5fe784b038e_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid)))` |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid)))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| close_sicoob_order_sla | BEFORE | INSERT OR UPDATE | ROW | enabled | public.close_sicoob_order_sla |
| set_sicoob_order_sla_deadline | BEFORE | INSERT OR UPDATE | ROW | enabled | public.set_sicoob_order_sla_deadline |
| tr_capture_sicoob_order_approval_policy | BEFORE | INSERT OR UPDATE | ROW | enabled | public.capture_sicoob_order_approval_policy |
| tr_freeze_sicoob_order_scope_pending_approval | BEFORE | UPDATE | ROW | enabled | public.freeze_sicoob_order_while_approval_pending |
| tr_guard_sicoob_approval_status_transition | BEFORE | UPDATE | ROW | enabled | public.guard_sicoob_approval_status_transition |
| tr_preserve_sicoob_artwork_requirement | BEFORE | UPDATE | ROW | enabled | public.preserve_sicoob_artwork_requirement |
| tr_protect_sicoob_order_consolidation_link | BEFORE | UPDATE | ROW | enabled | public.protect_sicoob_order_consolidation_link |
| tr_record_sicoob_order_status_event | AFTER | UPDATE | ROW | enabled | public.record_sicoob_order_status_event |
| tr_require_sicoob_artwork_before_production | BEFORE | UPDATE | ROW | enabled | public.require_sicoob_artwork_before_production |
| tr_validate_sicoob_order_status | BEFORE | UPDATE | ROW | enabled | public.validate_order_status_transition |
| trg_set_order_cost_center | BEFORE | INSERT | ROW | enabled | public.tg_set_order_cost_center |
| trg_validate_sicoob_order_budget | BEFORE | UPDATE | ROW | enabled | public.validate_sicoob_order_budget |
| trg_validate_sicoob_order_budget_ins | AFTER | INSERT | ROW | enabled | public.tg_sicoob_order_budget_after_insert |
| trigger_check_order_sla | BEFORE | INSERT OR UPDATE | ROW | enabled | public.check_order_sla |
| update_sicoob_orders_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
