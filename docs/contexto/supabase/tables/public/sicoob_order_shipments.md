# public.sicoob_order_shipments

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
| 3 | `carrier_name` | `text` | sim |  |  |  |
| 4 | `tracking_code` | `text` | sim |  |  |  |
| 5 | `status` | `text` | não | `'pending'::text` |  |  |
| 6 | `estimated_delivery` | `date` | sim |  |  |  |
| 7 | `actual_delivery_at` | `timestamp with time zone` | sim |  |  |  |
| 8 | `delivery_photo_path` | `text` | sim |  |  |  |
| 9 | `created_by` | `uuid` | não |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `delivery_photo_uploaded_by` | `uuid` | sim |  |  | Usuário proprietário do objeto Storage atualmente vinculado como comprovante de entrega. |
| 13 | `delivery_document_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sicoob_delivery_photo_uploader_required | CHECK | `CHECK (delivery_photo_path IS NULL OR delivery_photo_uploaded_by IS NOT NULL)` |  |  | sim |
| sicoob_order_shipments_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| sicoob_order_shipments_delivery_document_id_fkey | FOREIGN KEY | `FOREIGN KEY (delivery_document_id) REFERENCES sicoob_document_registry(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| sicoob_order_shipments_delivery_document_id_key | UNIQUE | `UNIQUE (delivery_document_id)` |  |  | sim |
| sicoob_order_shipments_delivery_photo_uploaded_by_fkey | FOREIGN KEY | `FOREIGN KEY (delivery_photo_uploaded_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| sicoob_order_shipments_order_id_fkey | FOREIGN KEY | `FOREIGN KEY (order_id) REFERENCES sicoob_orders(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| sicoob_order_shipments_order_id_key | UNIQUE | `UNIQUE (order_id)` |  |  | sim |
| sicoob_order_shipments_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sicoob_order_shipments_status_check | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'in_transit'::text, 'delivered'::text]))` |  |  | sim |
| sicoob_shipment_delivery_proof_path | CHECK | `CHECK (delivery_photo_path IS NULL OR delivery_photo_path ~~ (order_id::text \|\| '/delivery/%'::text))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_fk_sicoob_order_shipments_created_by_fkey | btree | created_by | não | sim |  | `CREATE INDEX idx_fk_sicoob_order_shipments_created_by_fkey ON public.sicoob_order_shipments USING btree (created_by)` |
| idx_sicoob_order_shipments_order_id | btree | order_id | não | sim |  | `CREATE INDEX idx_sicoob_order_shipments_order_id ON public.sicoob_order_shipments USING btree (order_id)` |
| idx_sicoob_order_shipments_tracking_code | btree | tracking_code | não | sim | `(tracking_code IS NOT NULL)` | `CREATE INDEX idx_sicoob_order_shipments_tracking_code ON public.sicoob_order_shipments USING btree (tracking_code) WHERE (tracking_code IS NOT NULL)` |
| idx_sicoob_shipments_photo_uploaded_by | btree | delivery_photo_uploaded_by | não | sim |  | `CREATE INDEX idx_sicoob_shipments_photo_uploaded_by ON public.sicoob_order_shipments USING btree (delivery_photo_uploaded_by)` |
| sicoob_order_shipments_delivery_document_id_key | btree | delivery_document_id | sim | sim |  | `CREATE UNIQUE INDEX sicoob_order_shipments_delivery_document_id_key ON public.sicoob_order_shipments USING btree (delivery_document_id)` |
| sicoob_order_shipments_order_id_key | btree | order_id | sim | sim |  | `CREATE UNIQUE INDEX sicoob_order_shipments_order_id_key ON public.sicoob_order_shipments USING btree (order_id)` |
| sicoob_order_shipments_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sicoob_order_shipments_pkey ON public.sicoob_order_shipments USING btree (id)` |
| ux_sicoob_order_shipment_delivery_photo | btree | delivery_photo_path | sim | sim | `(delivery_photo_path IS NOT NULL)` | `CREATE UNIQUE INDEX ux_sicoob_order_shipment_delivery_photo ON public.sicoob_order_shipments USING btree (delivery_photo_path) WHERE (delivery_photo_path IS NOT NULL)` |


## Policies (RLS)

### `sicoob_shipment_read_in_order_scope`

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
| tr_validate_sicoob_delivery_document | BEFORE | INSERT OR UPDATE | ROW | enabled | public.validate_sicoob_order_document |


## Grants

_nenhum_
