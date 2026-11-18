# public.order_consolidation_orders

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
| 1 | `consolidation_id` | `uuid` | não |  |  |  |
| 2 | `order_id` | `uuid` | não |  |  |  |
| 3 | `order_total_snapshot` | `numeric(14,2)` | não |  |  |  |
| 4 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| order_consolidation_orders_consolidation_id_fkey | FOREIGN KEY | `FOREIGN KEY (consolidation_id) REFERENCES order_consolidations(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| order_consolidation_orders_order_id_fkey | FOREIGN KEY | `FOREIGN KEY (order_id) REFERENCES sicoob_orders(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| order_consolidation_orders_order_id_key | UNIQUE | `UNIQUE (order_id)` |  |  | sim |
| order_consolidation_orders_order_total_snapshot_check | CHECK | `CHECK (order_total_snapshot >= 0::numeric)` |  |  | sim |
| order_consolidation_orders_pkey | PRIMARY KEY | `PRIMARY KEY (consolidation_id, order_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_consolidation_orders_group | btree | consolidation_id | não | sim |  | `CREATE INDEX idx_consolidation_orders_group ON public.order_consolidation_orders USING btree (consolidation_id)` |
| order_consolidation_orders_order_id_key | btree | order_id | sim | sim |  | `CREATE UNIQUE INDEX order_consolidation_orders_order_id_key ON public.order_consolidation_orders USING btree (order_id)` |
| order_consolidation_orders_pkey | btree | consolidation_id, order_id | sim | sim |  | `CREATE UNIQUE INDEX order_consolidation_orders_pkey ON public.order_consolidation_orders USING btree (consolidation_id, order_id)` |


## Policies (RLS)

### `consolidation_orders_read_in_scope`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `sicoob_current_actor_can_view_all_consolidation(consolidation_id)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_protect_consolidation_orders | BEFORE | INSERT OR DELETE OR UPDATE | ROW | enabled | public.protect_sicoob_consolidation_records |


## Grants

_nenhum_
