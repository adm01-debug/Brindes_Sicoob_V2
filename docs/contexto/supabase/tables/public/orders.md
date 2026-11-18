# public.orders

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
| 2 | `seller_id` | `uuid` | não |  |  |  |
| 3 | `order_number` | `text` | não | `''::text` |  |  |
| 4 | `status` | `text` | não | `'rascunho'::text` |  |  |
| 5 | `fulfillment_status` | `text` | não | `'unfulfilled'::text` |  |  |
| 6 | `client_id` | `text` | sim |  |  |  |
| 7 | `client_name` | `text` | sim |  |  |  |
| 8 | `client_email` | `text` | sim |  |  |  |
| 9 | `client_phone` | `text` | sim |  |  |  |
| 10 | `client_company` | `text` | sim |  |  |  |
| 11 | `quote_id` | `uuid` | sim |  |  |  |
| 12 | `subtotal` | `numeric` | sim | `0` |  |  |
| 13 | `discount_amount` | `numeric` | sim | `0` |  |  |
| 14 | `shipping_cost` | `numeric` | sim | `0` |  |  |
| 15 | `total` | `numeric` | sim | `0` |  |  |
| 16 | `notes` | `text` | sim |  |  |  |
| 17 | `internal_notes` | `text` | sim |  |  |  |
| 18 | `tracking_number` | `text` | sim |  |  |  |
| 19 | `shipping_type` | `text` | sim |  |  |  |
| 20 | `payment_terms` | `text` | sim |  |  |  |
| 21 | `delivery_time` | `text` | sim |  |  |  |
| 22 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 23 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 24 | `organization_id` | `uuid` | sim |  |  |  |
| 25 | `version` | `integer` | não | `1` |  |  |
| 26 | `shipping_carrier` | `text` | sim |  |  |  |
| 27 | `shipping_delivery_forecast` | `timestamp with time zone` | sim |  |  |  |
| 28 | `delivery_photo_url` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| orders_fulfillment_status_check | CHECK | `CHECK (fulfillment_status = ANY (ARRAY['unfulfilled'::text, 'partially_fulfilled'::text, 'fulfilled'::text]))` |  |  | sim |
| orders_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id)` | NO ACTION | NO ACTION | sim |
| orders_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| orders_quote_id_fkey | FOREIGN KEY | `FOREIGN KEY (quote_id) REFERENCES quotes(id)` | NO ACTION | NO ACTION | sim |
| orders_status_check | CHECK | `CHECK (status = ANY (ARRAY['rascunho'::text, 'enviado_gestor'::text, 'aprovado_gestor'::text, 'enviado_vendedor'::text, 'em_producao'::text, 'em_separacao'::text, 'em_transporte'::text, 'entregue'::text, 'concluido'::text, 'cancelado'::text]))` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.order_approval_history | order_approval_history_order_id_fkey | order_id | CASCADE |
| public.order_audit_events | order_audit_events_order_id_fkey | order_id | CASCADE |
| public.order_comments | order_comments_order_id_fkey | order_id | CASCADE |
| public.order_duplicate_requests | order_duplicate_requests_duplicated_order_id_fkey | duplicated_order_id | CASCADE |
| public.order_duplicate_requests | order_duplicate_requests_source_order_id_fkey | source_order_id | CASCADE |
| public.order_invoices | order_invoices_order_id_fkey | order_id | CASCADE |
| public.order_items | order_items_order_id_fkey | order_id | CASCADE |
| public.order_logistics | order_logistics_order_id_fkey | order_id | CASCADE |
| public.order_logistics_tracking | order_logistics_tracking_order_id_fkey | order_id | CASCADE |
| public.order_payments | order_payments_order_id_fkey | order_id | CASCADE |
| public.order_pilot_approvals | order_pilot_approvals_order_id_fkey | order_id | CASCADE |
| public.order_templates | order_templates_source_order_id_fkey | source_order_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_orders_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at DESC)` |
| idx_orders_organization_id | btree | organization_id | não | sim |  | `CREATE INDEX idx_orders_organization_id ON public.orders USING btree (organization_id)` |
| idx_orders_quote_id | btree | quote_id | não | sim |  | `CREATE INDEX idx_orders_quote_id ON public.orders USING btree (quote_id)` |
| idx_orders_seller_org | btree | seller_id, organization_id | não | sim |  | `CREATE INDEX idx_orders_seller_org ON public.orders USING btree (seller_id, organization_id)` |
| idx_orders_seller_status | btree | seller_id, status | não | sim |  | `CREATE INDEX idx_orders_seller_status ON public.orders USING btree (seller_id, status)` |
| idx_orders_seller_status_updated_at | btree | seller_id, status, updated_at | não | sim |  | `CREATE INDEX idx_orders_seller_status_updated_at ON public.orders USING btree (seller_id, status, updated_at DESC)` |
| idx_orders_seller_updated_at | btree | seller_id, updated_at | não | sim |  | `CREATE INDEX idx_orders_seller_updated_at ON public.orders USING btree (seller_id, updated_at DESC)` |
| orders_order_number_uidx | btree | order_number | sim | sim |  | `CREATE UNIQUE INDEX orders_order_number_uidx ON public.orders USING btree (order_number)` |
| orders_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX orders_pkey ON public.orders USING btree (id)` |


## Policies (RLS)

### `orders_delete_scope`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(can_view_all_sales() OR (seller_id = ( SELECT auth.uid() AS uid)))` |
| WITH CHECK |  |

### `orders_insert_scope`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(can_view_all_sales() OR (seller_id = ( SELECT auth.uid() AS uid)))` |

### `orders_select_scope`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(can_view_all_sales() OR (has_role(( SELECT auth.uid() AS uid), 'supervisor'::app_role) AND ((organization_id IS NULL) OR (organization_id IN ( SELECT get_user_org_ids(( SELECT auth.uid() AS uid)) AS get_user_org_ids)))) OR (seller_id = ( SELECT auth.uid() AS uid)))` |
| WITH CHECK |  |

### `orders_update_scope`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(can_view_all_sales() OR (has_role(( SELECT auth.uid() AS uid), 'supervisor'::app_role) AND ((organization_id IS NULL) OR (organization_id IN ( SELECT get_user_org_ids(( SELECT auth.uid() AS uid)) AS get_user_org_ids)))) OR (seller_id = ( SELECT auth.uid() AS uid)))` |
| WITH CHECK | `(can_view_all_sales() OR (has_role(( SELECT auth.uid() AS uid), 'supervisor'::app_role) AND ((organization_id IS NULL) OR (organization_id IN ( SELECT get_user_org_ids(( SELECT auth.uid() AS uid)) AS get_user_org_ids)))) OR (seller_id = ( SELECT auth.uid() AS uid)))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_order_number | BEFORE | INSERT | ROW | enabled | public.generate_order_number |
| tr_validate_main_order_status | BEFORE | UPDATE | ROW | enabled | public.validate_main_order_status_transition |
| tr_validate_order_fulfillment | BEFORE | UPDATE | ROW | enabled | public.validate_order_fulfillment_transition |
| trg_dispatch_webhook_orders | AFTER | INSERT | ROW | enabled | public.dispatch_quote_webhook_event |
| trg_log_order_status_change | AFTER | UPDATE | ROW | enabled | public.log_order_status_change |
| trg_notify_new_order | AFTER | INSERT | ROW | enabled | public.notify_new_order |
| trg_orders_increment_version | BEFORE | UPDATE | ROW | enabled | public.increment_row_version |
| trg_owner__orders__seller_id | BEFORE | INSERT | ROW | enabled | public.enforce_seller_id_owner |
| trg_validate_order_status | BEFORE | INSERT OR UPDATE | ROW | enabled | public.validate_status_fields |
| trig_prevent_order_deletion | BEFORE | DELETE | ROW | enabled | public.prevent_critical_deletion |
| update_orders_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
