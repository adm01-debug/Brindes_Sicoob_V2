# public.order_payments

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `order_id` | `uuid` | não |  |  |  |
| 3 | `invoice_id` | `uuid` | sim |  |  |  |
| 4 | `amount` | `numeric(14,2)` | não |  |  |  |
| 5 | `payment_method` | `text` | não |  |  |  |
| 6 | `payment_date` | `date` | não |  |  |  |
| 7 | `receipt_url` | `text` | sim |  |  |  |
| 8 | `reference` | `text` | sim |  |  |  |
| 9 | `notes` | `text` | sim |  |  |  |
| 10 | `created_by` | `uuid` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| order_payments_amount_check | CHECK | `CHECK (amount > 0::numeric)` |  |  | sim |
| order_payments_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| order_payments_invoice_id_fkey | FOREIGN KEY | `FOREIGN KEY (invoice_id) REFERENCES order_invoices(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| order_payments_order_id_fkey | FOREIGN KEY | `FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| order_payments_payment_method_check | CHECK | `CHECK (payment_method = ANY (ARRAY['pix'::text, 'boleto'::text, 'transfer'::text, 'credit_card'::text, 'debit_card'::text, 'cash'::text, 'other'::text]))` |  |  | sim |
| order_payments_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_fk_order_payments_created_by_fkey | btree | created_by | não | sim |  | `CREATE INDEX idx_fk_order_payments_created_by_fkey ON public.order_payments USING btree (created_by)` |
| idx_payments_date | btree | payment_date | não | sim |  | `CREATE INDEX idx_payments_date ON public.order_payments USING btree (payment_date)` |
| idx_payments_invoice | btree | invoice_id | não | sim |  | `CREATE INDEX idx_payments_invoice ON public.order_payments USING btree (invoice_id)` |
| idx_payments_order | btree | order_id | não | sim |  | `CREATE INDEX idx_payments_order ON public.order_payments USING btree (order_id)` |
| order_payments_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX order_payments_pkey ON public.order_payments USING btree (id)` |


## Policies (RLS)

### `sicoob_merged_5d6fccd3375f2d3f_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid))) OR (pg_has_role(CURRENT_USER, 'anon'::name, 'member'::text) AND false) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_order_owner_or_admin(order_id)))` |
| WITH CHECK | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid))) OR (pg_has_role(CURRENT_USER, 'anon'::name, 'member'::text) AND false) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_order_owner_or_admin(order_id)))` |

### `sicoob_merged_93e74632bdd60753_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'dev'::app_role))) OR (pg_has_role(CURRENT_USER, 'anon'::name, 'member'::text) AND false))` |
| WITH CHECK |  |

### `sicoob_merged_b0789410180239bd_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid))) OR (true AND (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['supervisor'::text, 'dev'::text, 'admin'::text, 'manager'::text])))))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND ((EXISTS ( SELECT 1    FROM orders o   WHERE ((o.id = order_payments.order_id) AND ((o.seller_id = ( SELECT auth.uid() AS uid)) OR (o.organization_id IN ( SELECT get_user_org_ids(( SELECT auth.uid() AS uid)) AS get_user_org_ids)))))) OR is_admin(( SELECT auth.uid() AS uid)))) OR (pg_has_role(CURRENT_USER, 'anon'::name, 'member'::text) AND false) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_order_owner_or_admin(order_id)))` |
| WITH CHECK |  |

### `sicoob_merged_bc6b7ea12d0b7fb7_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid))) OR (pg_has_role(CURRENT_USER, 'anon'::name, 'member'::text) AND false) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_order_owner_or_admin(order_id)))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_order_payments_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
