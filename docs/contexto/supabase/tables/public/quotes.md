# public.quotes

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


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `quote_number` | `text` | não | `''::text` |  |  |
| 3 | `client_id` | `text` | sim |  |  |  |
| 4 | `client_name` | `text` | sim |  |  |  |
| 5 | `client_email` | `text` | sim |  |  |  |
| 6 | `client_phone` | `text` | sim |  |  |  |
| 7 | `client_company` | `text` | sim |  |  |  |
| 8 | `client_cnpj` | `text` | sim |  |  |  |
| 9 | `seller_id` | `uuid` | não |  |  |  |
| 10 | `status` | `text` | não | `'draft'::text` |  |  |
| 11 | `subtotal` | `numeric` | não | `0` |  |  |
| 12 | `discount_percent` | `numeric` | não | `0` |  |  |
| 13 | `discount_amount` | `numeric` | não | `0` |  |  |
| 14 | `total` | `numeric` | não | `0` |  |  |
| 15 | `notes` | `text` | sim |  |  |  |
| 16 | `payment_terms` | `text` | sim |  |  |  |
| 17 | `delivery_time` | `text` | sim |  |  |  |
| 18 | `shipping_type` | `text` | sim |  |  |  |
| 19 | `shipping_cost` | `numeric` | sim | `0` |  |  |
| 20 | `internal_notes` | `text` | sim |  |  |  |
| 21 | `valid_until` | `timestamp with time zone` | sim |  |  |  |
| 22 | `bitrix_deal_id` | `text` | sim |  |  |  |
| 23 | `bitrix_quote_id` | `text` | sim |  |  |  |
| 24 | `synced_to_bitrix` | `boolean` | sim | `false` |  |  |
| 25 | `synced_at` | `timestamp with time zone` | sim |  |  |  |
| 26 | `client_response` | `text` | sim |  |  |  |
| 27 | `client_response_at` | `timestamp with time zone` | sim |  |  |  |
| 28 | `client_response_notes` | `text` | sim |  |  |  |
| 29 | `sent_at` | `timestamp with time zone` | sim |  |  |  |
| 30 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 31 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 32 | `version` | `integer` | não | `1` |  |  |
| 33 | `parent_quote_id` | `uuid` | sim |  |  |  |
| 34 | `is_latest_version` | `boolean` | não | `true` |  |  |
| 35 | `organization_id` | `uuid` | sim |  |  |  |
| 36 | `negotiation_markup_percent` | `numeric(5,2)` | não | `0` |  |  |
| 37 | `real_subtotal` | `numeric(12,2)` | sim |  |  |  |
| 38 | `real_discount_percent` | `numeric(5,2)` | sim |  |  |  |
| 39 | `approved_by` | `uuid` | sim |  |  |  |
| 40 | `approved_at` | `timestamp with time zone` | sim |  |  |  |
| 41 | `rejection_notes` | `text` | sim |  |  |  |
| 42 | `pa_id` | `uuid` | sim |  |  |  |
| 43 | `singular_id` | `uuid` | sim |  |  |  |
| 44 | `consolidation_id` | `uuid` | sim |  |  |  |
| 45 | `suggested_modifications` | `jsonb` | sim |  |  |  |
| 46 | `approved_pdf_url` | `text` | sim |  |  |  |
| 47 | `tags` | `text[]` | sim | `'{}'::text[]` |  |  |
| 48 | `total_cost` | `numeric` | sim | `0` |  |  |
| 49 | `row_version` | `integer` | não | `1` |  |  |
| 50 | `deleted_at` | `timestamp with time zone` | sim |  |  |  |
| 51 | `is_active` | `boolean` | sim | `true` |  |  |
| 52 | `reorder_source_order_id` | `uuid` | sim |  |  |  |
| 53 | `reorder_source_quote_id` | `uuid` | sim |  |  |  |
| 54 | `catalog_revalidated_at` | `timestamp with time zone` | sim |  |  |  |
| 55 | `catalog_valid_until` | `timestamp with time zone` | sim |  |  | Validade da consulta ao catálogo usada na recompra; não representa reserva de estoque. |
| 56 | `catalog_stock_is_reserved` | `boolean` | não | `false` |  | Sempre false: o catálogo mestre é somente consulta e não reserva estoque. |
| 57 | `reorder_price_changed_items` | `integer` | não | `0` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| quotes_approved_by_fkey | FOREIGN KEY | `FOREIGN KEY (approved_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| quotes_catalog_not_reservation_check | CHECK | `CHECK (catalog_stock_is_reserved IS FALSE)` |  |  | sim |
| quotes_catalog_validity_check | CHECK | `CHECK (catalog_valid_until IS NULL OR catalog_revalidated_at IS NOT NULL AND catalog_valid_until > catalog_revalidated_at)` |  |  | sim |
| quotes_consolidation_id_fkey | FOREIGN KEY | `FOREIGN KEY (consolidation_id) REFERENCES quote_consolidations(id)` | NO ACTION | NO ACTION | sim |
| quotes_negotiation_markup_range | CHECK | `CHECK (negotiation_markup_percent >= 0::numeric AND negotiation_markup_percent <= 50::numeric)` |  |  | sim |
| quotes_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id)` | NO ACTION | NO ACTION | sim |
| quotes_pa_id_fkey | FOREIGN KEY | `FOREIGN KEY (pa_id) REFERENCES postos_atendimento(id)` | NO ACTION | NO ACTION | sim |
| quotes_parent_quote_id_fkey | FOREIGN KEY | `FOREIGN KEY (parent_quote_id) REFERENCES quotes(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| quotes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| quotes_reorder_price_changes_check | CHECK | `CHECK (reorder_price_changed_items >= 0)` |  |  | sim |
| quotes_reorder_single_source_check | CHECK | `CHECK (reorder_source_order_id IS NULL OR reorder_source_quote_id IS NULL)` |  |  | sim |
| quotes_reorder_source_order_id_fkey | FOREIGN KEY | `FOREIGN KEY (reorder_source_order_id) REFERENCES sicoob_orders(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| quotes_reorder_source_quote_id_fkey | FOREIGN KEY | `FOREIGN KEY (reorder_source_quote_id) REFERENCES quotes(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| quotes_singular_id_fkey | FOREIGN KEY | `FOREIGN KEY (singular_id) REFERENCES cooperativas(id)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.discount_approval_requests | discount_approval_requests_quote_id_fkey | quote_id | CASCADE |
| public.orders | orders_quote_id_fkey | quote_id | NO ACTION |
| public.quote_audit_logs | quote_audit_logs_quote_id_fkey | quote_id | CASCADE |
| public.quote_history | quote_history_quote_id_fkey | quote_id | CASCADE |
| public.quote_items | quote_items_quote_id_fkey | quote_id | CASCADE |
| public.quote_save_idempotency | quote_save_idempotency_quote_id_fkey | quote_id | CASCADE |
| public.quotes | quotes_parent_quote_id_fkey | parent_quote_id | SET NULL |
| public.quotes | quotes_reorder_source_quote_id_fkey | reorder_source_quote_id | RESTRICT |
| public.sicoob_kit_quote_requests | sicoob_kit_quote_requests_quote_id_fkey | quote_id | RESTRICT |
| public.sicoob_orders | sicoob_orders_source_quote_id_fkey | source_quote_id | RESTRICT |
| public.sicoob_quote_reorder_requests | sicoob_quote_reorder_requests_quote_id_fkey | quote_id | RESTRICT |
| public.sicoob_quote_reorder_requests | sicoob_quote_reorder_requests_source_quote_id_fkey | source_quote_id | RESTRICT |
| public.sicoob_reorder_requests | sicoob_reorder_requests_quote_id_fkey | quote_id | RESTRICT |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_fk_quotes_approved_by_fkey | btree | approved_by | não | sim |  | `CREATE INDEX idx_fk_quotes_approved_by_fkey ON public.quotes USING btree (approved_by)` |
| idx_fk_quotes_consolidation_id_fkey | btree | consolidation_id | não | sim |  | `CREATE INDEX idx_fk_quotes_consolidation_id_fkey ON public.quotes USING btree (consolidation_id)` |
| idx_fk_quotes_pa_id_fkey | btree | pa_id | não | sim |  | `CREATE INDEX idx_fk_quotes_pa_id_fkey ON public.quotes USING btree (pa_id)` |
| idx_fk_quotes_singular_id_fkey | btree | singular_id | não | sim |  | `CREATE INDEX idx_fk_quotes_singular_id_fkey ON public.quotes USING btree (singular_id)` |
| idx_quotes_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_quotes_created_at ON public.quotes USING btree (created_at DESC)` |
| idx_quotes_one_latest_version_per_family | btree |  | sim | sim | `(is_latest_version AND (deleted_at IS NULL))` | `CREATE UNIQUE INDEX idx_quotes_one_latest_version_per_family ON public.quotes USING btree (COALESCE(parent_quote_id, id)) WHERE (is_latest_version AND (deleted_at IS NULL))` |
| idx_quotes_organization_id | btree | organization_id | não | sim |  | `CREATE INDEX idx_quotes_organization_id ON public.quotes USING btree (organization_id)` |
| idx_quotes_parent_quote_id | btree | parent_quote_id | não | sim |  | `CREATE INDEX idx_quotes_parent_quote_id ON public.quotes USING btree (parent_quote_id)` |
| idx_quotes_reorder_source_order | btree | reorder_source_order_id | não | sim | `(reorder_source_order_id IS NOT NULL)` | `CREATE INDEX idx_quotes_reorder_source_order ON public.quotes USING btree (reorder_source_order_id) WHERE (reorder_source_order_id IS NOT NULL)` |
| idx_quotes_reorder_source_quote | btree | reorder_source_quote_id | não | sim | `(reorder_source_quote_id IS NOT NULL)` | `CREATE INDEX idx_quotes_reorder_source_quote ON public.quotes USING btree (reorder_source_quote_id) WHERE (reorder_source_quote_id IS NOT NULL)` |
| idx_quotes_seller_org | btree | seller_id, organization_id | não | sim |  | `CREATE INDEX idx_quotes_seller_org ON public.quotes USING btree (seller_id, organization_id)` |
| idx_quotes_seller_status | btree | seller_id, status | não | sim |  | `CREATE INDEX idx_quotes_seller_status ON public.quotes USING btree (seller_id, status)` |
| idx_quotes_seller_status_updated_at | btree | seller_id, status, updated_at | não | sim |  | `CREATE INDEX idx_quotes_seller_status_updated_at ON public.quotes USING btree (seller_id, status, updated_at DESC)` |
| idx_quotes_seller_updated_at | btree | seller_id, updated_at | não | sim |  | `CREATE INDEX idx_quotes_seller_updated_at ON public.quotes USING btree (seller_id, updated_at DESC)` |
| idx_quotes_tags | gin | tags | não | sim |  | `CREATE INDEX idx_quotes_tags ON public.quotes USING gin (tags)` |
| idx_quotes_version | btree | parent_quote_id, version | não | sim |  | `CREATE INDEX idx_quotes_version ON public.quotes USING btree (parent_quote_id, version)` |
| quotes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX quotes_pkey ON public.quotes USING btree (id)` |


## Policies (RLS)

### `sicoob_merged_30bc0c180d4374c2_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND ((deleted_at IS NULL) AND ((has_role(( SELECT auth.uid() AS uid), 'gerente_pa'::app_role) AND (pa_id = get_user_pa_id())) OR (has_role(( SELECT auth.uid() AS uid), 'comprador_pac'::app_role) AND (pa_id = get_user_pa_id())) OR (has_role(( SELECT auth.uid() AS uid), 'gestor_compras'::app_role) AND (singular_id = get_user_cooperative_id())) OR (has_role(( SELECT auth.uid() AS uid), 'comprador_singular'::app_role) AND (singular_id = get_user_cooperative_id())) OR has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'dev'::app_role) OR (seller_id = ( SELECT auth.uid() AS uid))))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND ((deleted_at IS NULL) AND (can_view_all_sales() OR (has_role(( SELECT auth.uid() AS uid), 'supervisor'::app_role) AND ((organization_id IS NULL) OR (organization_id IN ( SELECT get_user_org_ids(( SELECT auth.uid() AS uid)) AS get_user_org_ids)))) OR (seller_id = ( SELECT auth.uid() AS uid))))))` |
| WITH CHECK |  |

### `sicoob_merged_461b84372a6adc21_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (can_view_all_sales() OR (has_role(( SELECT auth.uid() AS uid), 'supervisor'::app_role) AND ((organization_id IS NULL) OR (organization_id IN ( SELECT get_user_org_ids(( SELECT auth.uid() AS uid)) AS get_user_org_ids)))) OR (seller_id = ( SELECT auth.uid() AS uid))))` |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (can_view_all_sales() OR (has_role(( SELECT auth.uid() AS uid), 'supervisor'::app_role) AND ((organization_id IS NULL) OR (organization_id IN ( SELECT get_user_org_ids(( SELECT auth.uid() AS uid)) AS get_user_org_ids)))) OR (seller_id = ( SELECT auth.uid() AS uid))))` |

### `sicoob_merged_58e5ad60be903be7_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (can_view_all_sales() OR (seller_id = ( SELECT auth.uid() AS uid))))` |

### `sicoob_merged_ee9d8da4e1f9aea5_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (can_view_all_sales() OR (seller_id = ( SELECT auth.uid() AS uid))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| aaa_guard_quote_governance_write | BEFORE | INSERT OR DELETE OR UPDATE | ROW | enabled | public.guard_quote_governance_write |
| sync_quotes_is_active | BEFORE | UPDATE | ROW | enabled | public.sync_is_active_with_deleted_at |
| tr_guard_sicoob_reorder_catalog_validity | BEFORE | UPDATE | ROW | enabled | public.sicoob_guard_reorder_catalog_validity |
| tr_normalize_quote_parent_root | BEFORE | INSERT OR UPDATE | ROW | enabled | public.normalize_quote_parent_root |
| tr_protect_latest_quote_version_deletion | BEFORE | DELETE OR UPDATE | ROW | enabled | public.protect_latest_quote_version_deletion |
| tr_set_quote_hierarchy | BEFORE | INSERT | ROW | enabled | public.set_quote_hierarchy |
| trg_dispatch_webhook_quotes | AFTER | INSERT OR UPDATE | ROW | enabled | public.dispatch_quote_webhook_event |
| trg_notify_quote_status_change | AFTER | UPDATE | ROW | enabled | public.notify_quote_status_change |
| trg_notify_singular_quote_submission | AFTER | UPDATE | ROW | enabled | public.notify_singular_quote_submission |
| trg_owner__quotes__seller_id | BEFORE | INSERT | ROW | enabled | public.enforce_seller_id_owner |
| trg_quotes_row_version | BEFORE | UPDATE | ROW | enabled | public.handle_row_version |
| trg_validate_quote_real_discount | BEFORE | INSERT OR UPDATE | ROW | enabled | public.validate_quote_real_discount |
| trg_validate_quote_status | BEFORE | INSERT OR UPDATE | ROW | enabled | public.validate_status_fields |
| trig_prevent_quote_deletion | BEFORE | DELETE | ROW | enabled | public.prevent_critical_deletion |
| trigger_generate_quote_number | BEFORE | INSERT | ROW | enabled | public.generate_quote_number |
| update_quotes_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
