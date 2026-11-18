# public.sicoob_order_items

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
| 2 | `order_id` | `uuid` | sim |  |  |  |
| 3 | `product_id` | `uuid` | sim |  |  |  |
| 4 | `product_name` | `text` | não |  |  |  |
| 5 | `quantity` | `integer` | não | `1` |  |  |
| 6 | `unit_price` | `numeric(12,2)` | não |  |  |  |
| 7 | `total_price` | `numeric(12,2)` | não |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `product_image_url` | `text` | sim |  |  |  |
| 10 | `product_sku` | `text` | sim |  |  |  |
| 11 | `color_name` | `text` | sim |  |  |  |
| 12 | `color_hex` | `text` | sim |  |  |  |
| 13 | `variant_id` | `uuid` | sim |  |  |  |
| 14 | `variant_sku` | `text` | sim |  |  |  |
| 15 | `size_code` | `text` | sim |  |  |  |
| 16 | `personalization_snapshot` | `jsonb` | sim |  |  |  |
| 17 | `personalization_amount` | `numeric(14,2)` | não | `0` |  |  |
| 18 | `line_total_amount` | `numeric(14,2)` | sim | `round((COALESCE(total_price, (0)::numeric) + personalization_amount), 2)` | s |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| check_positive_quantity | CHECK | `CHECK (quantity > 0)` |  |  | sim |
| check_positive_unit_price | CHECK | `CHECK (unit_price >= 0::numeric)` |  |  | sim |
| sicoob_order_items_order_id_fkey | FOREIGN KEY | `FOREIGN KEY (order_id) REFERENCES sicoob_orders(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| sicoob_order_items_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.sicoob_delivery_allocations | sicoob_delivery_allocations_order_item_id_fkey | order_item_id | RESTRICT |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sicoob_order_items_order_id | btree | order_id | não | sim |  | `CREATE INDEX idx_sicoob_order_items_order_id ON public.sicoob_order_items USING btree (order_id)` |
| sicoob_order_items_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sicoob_order_items_pkey ON public.sicoob_order_items USING btree (id)` |


## Policies (RLS)

### `sicoob_order_items_read_scoped`

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
| tr_freeze_sicoob_order_items_pending_approval | BEFORE | INSERT OR DELETE OR UPDATE | ROW | enabled | public.freeze_sicoob_order_while_approval_pending |
| trg_audit_sicoob_order_items | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.audit_sicoob_order_item_changes |


## Grants

_nenhum_
