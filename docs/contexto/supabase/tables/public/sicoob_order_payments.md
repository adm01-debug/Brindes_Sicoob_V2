# public.sicoob_order_payments

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `order_id` | `uuid` | não |  |  |  |
| 3 | `invoice_id` | `uuid` | sim |  |  |  |
| 4 | `installment_number` | `integer` | não | `1` |  |  |
| 5 | `amount` | `numeric(14,2)` | não |  |  |  |
| 6 | `due_date` | `date` | não |  |  |  |
| 7 | `paid_at` | `timestamp with time zone` | sim |  |  |  |
| 8 | `refunded_at` | `timestamp with time zone` | sim |  |  |  |
| 9 | `refunded_by` | `uuid` | sim |  |  |  |
| 10 | `refund_reason` | `text` | sim |  |  |  |
| 11 | `payment_method` | `text` | sim |  |  |  |
| 12 | `external_reference` | `text` | sim |  |  |  |
| 13 | `status` | `text` | não | `'pending'::text` |  |  |
| 14 | `created_by` | `uuid` | não |  |  |  |
| 15 | `updated_by` | `uuid` | não |  |  |  |
| 16 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 17 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sicoob_order_payments_amount_check | CHECK | `CHECK (amount > 0::numeric)` |  |  | sim |
| sicoob_order_payments_check | CHECK | `CHECK (status = 'paid'::text AND paid_at IS NOT NULL OR status <> 'paid'::text)` |  |  | sim |
| sicoob_order_payments_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| sicoob_order_payments_installment_number_check | CHECK | `CHECK (installment_number > 0)` |  |  | sim |
| sicoob_order_payments_invoice_id_fkey | FOREIGN KEY | `FOREIGN KEY (invoice_id) REFERENCES sicoob_order_invoices(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| sicoob_order_payments_order_id_fkey | FOREIGN KEY | `FOREIGN KEY (order_id) REFERENCES sicoob_orders(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| sicoob_order_payments_order_id_installment_number_key | UNIQUE | `UNIQUE (order_id, installment_number)` |  |  | sim |
| sicoob_order_payments_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sicoob_order_payments_refund_audit_check | CHECK | `CHECK (status = 'refunded'::text AND refunded_at IS NOT NULL AND refunded_by IS NOT NULL AND length(TRIM(BOTH FROM refund_reason)) >= 10 OR status <> 'refunded'::text AND refunded_at IS NULL AND refunded_by IS NULL AND refund_reason IS NULL)` |  |  | sim |
| sicoob_order_payments_refunded_by_fkey | FOREIGN KEY | `FOREIGN KEY (refunded_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| sicoob_order_payments_status_check | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'paid'::text, 'overdue'::text, 'cancelled'::text, 'refunded'::text]))` |  |  | sim |
| sicoob_order_payments_updated_by_fkey | FOREIGN KEY | `FOREIGN KEY (updated_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_fk_sicoob_order_payments_created_by_fkey | btree | created_by | não | sim |  | `CREATE INDEX idx_fk_sicoob_order_payments_created_by_fkey ON public.sicoob_order_payments USING btree (created_by)` |
| idx_fk_sicoob_order_payments_invoice_id_fkey | btree | invoice_id | não | sim |  | `CREATE INDEX idx_fk_sicoob_order_payments_invoice_id_fkey ON public.sicoob_order_payments USING btree (invoice_id)` |
| idx_fk_sicoob_order_payments_refunded_by_fkey | btree | refunded_by | não | sim |  | `CREATE INDEX idx_fk_sicoob_order_payments_refunded_by_fkey ON public.sicoob_order_payments USING btree (refunded_by)` |
| idx_fk_sicoob_order_payments_updated_by_fkey | btree | updated_by | não | sim |  | `CREATE INDEX idx_fk_sicoob_order_payments_updated_by_fkey ON public.sicoob_order_payments USING btree (updated_by)` |
| idx_sicoob_order_payments_order | btree | order_id, due_date | não | sim |  | `CREATE INDEX idx_sicoob_order_payments_order ON public.sicoob_order_payments USING btree (order_id, due_date)` |
| sicoob_order_payments_order_id_installment_number_key | btree | order_id, installment_number | sim | sim |  | `CREATE UNIQUE INDEX sicoob_order_payments_order_id_installment_number_key ON public.sicoob_order_payments USING btree (order_id, installment_number)` |
| sicoob_order_payments_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sicoob_order_payments_pkey ON public.sicoob_order_payments USING btree (id)` |
| ux_sicoob_order_payment_external_reference | btree | order_id, external_reference | sim | sim | `(external_reference IS NOT NULL)` | `CREATE UNIQUE INDEX ux_sicoob_order_payment_external_reference ON public.sicoob_order_payments USING btree (order_id, external_reference) WHERE (external_reference IS NOT NULL)` |


## Policies (RLS)

### `sicoob_payments_read_in_order_scope`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `sicoob_current_actor_can_read_order(order_id)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_protect_sicoob_order_payment | BEFORE | INSERT OR DELETE OR UPDATE | ROW | enabled | public.protect_sicoob_order_payment |


## Grants

_nenhum_
