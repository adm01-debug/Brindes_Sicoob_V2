# public.sicoob_order_invoices

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
| 3 | `invoice_number` | `text` | não |  |  |  |
| 4 | `file_type` | `text` | não |  |  |  |
| 5 | `file_path` | `text` | não |  |  |  |
| 6 | `amount` | `numeric(14,2)` | sim |  |  |  |
| 7 | `access_key` | `text` | sim |  |  |  |
| 8 | `issued_at` | `date` | sim |  |  |  |
| 9 | `created_by` | `uuid` | não |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `document_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sicoob_order_invoices_amount_check | CHECK | `CHECK (amount IS NULL OR amount >= 0::numeric)` |  |  | sim |
| sicoob_order_invoices_check | CHECK | `CHECK (file_path ~~ (order_id::text \|\| '/invoices/%'::text))` |  |  | sim |
| sicoob_order_invoices_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| sicoob_order_invoices_document_id_fkey | FOREIGN KEY | `FOREIGN KEY (document_id) REFERENCES sicoob_document_registry(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| sicoob_order_invoices_document_id_key | UNIQUE | `UNIQUE (document_id)` |  |  | sim |
| sicoob_order_invoices_file_type_check | CHECK | `CHECK (file_type = ANY (ARRAY['pdf'::text, 'xml'::text]))` |  |  | sim |
| sicoob_order_invoices_invoice_number_check | CHECK | `CHECK (length(TRIM(BOTH FROM invoice_number)) > 0)` |  |  | sim |
| sicoob_order_invoices_order_id_fkey | FOREIGN KEY | `FOREIGN KEY (order_id) REFERENCES sicoob_orders(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| sicoob_order_invoices_order_id_invoice_number_file_type_key | UNIQUE | `UNIQUE (order_id, invoice_number, file_type)` |  |  | sim |
| sicoob_order_invoices_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.sicoob_order_payments | sicoob_order_payments_invoice_id_fkey | invoice_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_fk_sicoob_order_invoices_created_by_fkey | btree | created_by | não | sim |  | `CREATE INDEX idx_fk_sicoob_order_invoices_created_by_fkey ON public.sicoob_order_invoices USING btree (created_by)` |
| idx_sicoob_order_invoices_order | btree | order_id, created_at | não | sim |  | `CREATE INDEX idx_sicoob_order_invoices_order ON public.sicoob_order_invoices USING btree (order_id, created_at DESC)` |
| sicoob_order_invoices_document_id_key | btree | document_id | sim | sim |  | `CREATE UNIQUE INDEX sicoob_order_invoices_document_id_key ON public.sicoob_order_invoices USING btree (document_id)` |
| sicoob_order_invoices_order_id_invoice_number_file_type_key | btree | order_id, invoice_number, file_type | sim | sim |  | `CREATE UNIQUE INDEX sicoob_order_invoices_order_id_invoice_number_file_type_key ON public.sicoob_order_invoices USING btree (order_id, invoice_number, file_type)` |
| sicoob_order_invoices_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sicoob_order_invoices_pkey ON public.sicoob_order_invoices USING btree (id)` |
| ux_sicoob_order_invoice_file_path | btree | file_path | sim | sim |  | `CREATE UNIQUE INDEX ux_sicoob_order_invoice_file_path ON public.sicoob_order_invoices USING btree (file_path)` |


## Policies (RLS)

### `sicoob_invoices_read_in_order_scope`

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
| tr_validate_sicoob_invoice_document | BEFORE | INSERT OR UPDATE | ROW | enabled | public.validate_sicoob_order_document |


## Grants

_nenhum_
