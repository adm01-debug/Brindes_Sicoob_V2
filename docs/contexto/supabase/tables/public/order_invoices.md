# public.order_invoices

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
| 3 | `invoice_number` | `text` | não |  |  |  |
| 4 | `access_key` | `text` | sim |  |  |  |
| 5 | `serie` | `text` | sim |  |  |  |
| 6 | `issue_date` | `date` | sim |  |  |  |
| 7 | `due_date` | `date` | sim |  |  |  |
| 8 | `amount` | `numeric(14,2)` | não |  |  |  |
| 9 | `pdf_url` | `text` | sim |  |  |  |
| 10 | `xml_url` | `text` | sim |  |  |  |
| 11 | `status` | `text` | não | `'issued'::text` |  |  |
| 12 | `notes` | `text` | sim |  |  |  |
| 13 | `created_by` | `uuid` | sim |  |  |  |
| 14 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| order_invoices_amount_check | CHECK | `CHECK (amount >= 0::numeric)` |  |  | sim |
| order_invoices_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| order_invoices_order_id_fkey | FOREIGN KEY | `FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| order_invoices_order_id_invoice_number_key | UNIQUE | `UNIQUE (order_id, invoice_number)` |  |  | sim |
| order_invoices_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| order_invoices_status_check | CHECK | `CHECK (status = ANY (ARRAY['issued'::text, 'paid'::text, 'cancelled'::text, 'overdue'::text]))` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.order_payments | order_payments_invoice_id_fkey | invoice_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_fk_order_invoices_created_by_fkey | btree | created_by | não | sim |  | `CREATE INDEX idx_fk_order_invoices_created_by_fkey ON public.order_invoices USING btree (created_by)` |
| idx_invoices_due_date | btree | due_date | não | sim | `(status = ANY (ARRAY['issued'::text, 'overdue'::text]))` | `CREATE INDEX idx_invoices_due_date ON public.order_invoices USING btree (due_date) WHERE (status = ANY (ARRAY['issued'::text, 'overdue'::text]))` |
| idx_invoices_status | btree | status | não | sim |  | `CREATE INDEX idx_invoices_status ON public.order_invoices USING btree (status)` |
| idx_order_invoices_order_id | btree | order_id | não | sim |  | `CREATE INDEX idx_order_invoices_order_id ON public.order_invoices USING btree (order_id)` |
| order_invoices_order_id_invoice_number_key | btree | order_id, invoice_number | sim | sim |  | `CREATE UNIQUE INDEX order_invoices_order_id_invoice_number_key ON public.order_invoices USING btree (order_id, invoice_number)` |
| order_invoices_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX order_invoices_pkey ON public.order_invoices USING btree (id)` |


## Policies (RLS)

### `sicoob_merged_0269aa29b0f49a79_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND ((EXISTS ( SELECT 1    FROM orders o   WHERE ((o.id = order_invoices.order_id) AND ((o.seller_id = ( SELECT auth.uid() AS uid)) OR (o.organization_id IN ( SELECT get_user_org_ids(( SELECT auth.uid() AS uid)) AS get_user_org_ids)))))) OR is_admin(( SELECT auth.uid() AS uid)))) OR (pg_has_role(CURRENT_USER, 'anon'::name, 'member'::text) AND false) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_order_owner_or_admin(order_id)))` |
| WITH CHECK |  |

### `sicoob_merged_04b474c69c8478f9_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid))) OR (pg_has_role(CURRENT_USER, 'anon'::name, 'member'::text) AND false) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_order_owner_or_admin(order_id)))` |

### `sicoob_merged_3713488a89f91d46_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'dev'::app_role))) OR (pg_has_role(CURRENT_USER, 'anon'::name, 'member'::text) AND false))` |
| WITH CHECK |  |

### `sicoob_merged_5b95a7d028ca7594_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid))) OR (pg_has_role(CURRENT_USER, 'anon'::name, 'member'::text) AND false) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_order_owner_or_admin(order_id)))` |
| WITH CHECK | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid))) OR (pg_has_role(CURRENT_USER, 'anon'::name, 'member'::text) AND false) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_order_owner_or_admin(order_id)))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_order_invoices_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
