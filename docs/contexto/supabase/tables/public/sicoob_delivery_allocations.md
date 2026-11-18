# public.sicoob_delivery_allocations

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
| 2 | `destination_id` | `uuid` | não |  |  |  |
| 3 | `order_item_id` | `uuid` | não |  |  |  |
| 4 | `quantity` | `integer` | não |  |  |  |
| 5 | `received_quantity` | `integer` | não | `0` |  |  |
| 6 | `damaged_quantity` | `integer` | não | `0` |  |  |
| 7 | `missing_quantity` | `integer` | não | `0` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sicoob_delivery_allocations_check | CHECK | `CHECK ((received_quantity + damaged_quantity + missing_quantity) <= quantity)` |  |  | sim |
| sicoob_delivery_allocations_damaged_quantity_check | CHECK | `CHECK (damaged_quantity >= 0)` |  |  | sim |
| sicoob_delivery_allocations_destination_id_fkey | FOREIGN KEY | `FOREIGN KEY (destination_id) REFERENCES sicoob_delivery_destinations(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| sicoob_delivery_allocations_destination_id_order_item_id_key | UNIQUE | `UNIQUE (destination_id, order_item_id)` |  |  | sim |
| sicoob_delivery_allocations_missing_quantity_check | CHECK | `CHECK (missing_quantity >= 0)` |  |  | sim |
| sicoob_delivery_allocations_order_item_id_fkey | FOREIGN KEY | `FOREIGN KEY (order_item_id) REFERENCES sicoob_order_items(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| sicoob_delivery_allocations_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sicoob_delivery_allocations_quantity_check | CHECK | `CHECK (quantity > 0)` |  |  | sim |
| sicoob_delivery_allocations_received_quantity_check | CHECK | `CHECK (received_quantity >= 0)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.sicoob_delivery_receipt_events | sicoob_delivery_receipt_events_allocation_id_fkey | allocation_id | RESTRICT |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_delivery_allocations_destination | btree | destination_id | não | sim |  | `CREATE INDEX idx_delivery_allocations_destination ON public.sicoob_delivery_allocations USING btree (destination_id)` |
| idx_sicoob_delivery_allocations_order_item_id | btree | order_item_id | não | sim |  | `CREATE INDEX idx_sicoob_delivery_allocations_order_item_id ON public.sicoob_delivery_allocations USING btree (order_item_id)` |
| sicoob_delivery_allocations_destination_id_order_item_id_key | btree | destination_id, order_item_id | sim | sim |  | `CREATE UNIQUE INDEX sicoob_delivery_allocations_destination_id_order_item_id_key ON public.sicoob_delivery_allocations USING btree (destination_id, order_item_id)` |
| sicoob_delivery_allocations_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sicoob_delivery_allocations_pkey ON public.sicoob_delivery_allocations USING btree (id)` |


## Policies (RLS)

### `delivery_allocations_read_in_scope`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(sicoob_current_actor_can_receive_destination(destination_id) OR (EXISTS ( SELECT 1    FROM sicoob_delivery_destinations d   WHERE ((d.id = sicoob_delivery_allocations.destination_id) AND sicoob_current_actor_can_view_all_consolidation(d.consolidation_id)))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_protect_delivery_allocations | BEFORE | INSERT OR DELETE OR UPDATE | ROW | enabled | public.protect_sicoob_consolidation_records |


## Grants

_nenhum_
