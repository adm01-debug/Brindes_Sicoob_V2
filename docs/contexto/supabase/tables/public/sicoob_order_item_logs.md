# public.sicoob_order_item_logs

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
| 3 | `item_id` | `uuid` | não |  |  |  |
| 4 | `user_id` | `uuid` | sim |  |  |  |
| 5 | `action` | `text` | não |  |  |  |
| 6 | `old_data` | `jsonb` | sim |  |  |  |
| 7 | `new_data` | `jsonb` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sicoob_order_item_logs_order_id_fkey | FOREIGN KEY | `FOREIGN KEY (order_id) REFERENCES sicoob_orders(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| sicoob_order_item_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sicoob_order_item_logs_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_fk_sicoob_order_item_logs_user_id_fkey | btree | user_id | não | sim |  | `CREATE INDEX idx_fk_sicoob_order_item_logs_user_id_fkey ON public.sicoob_order_item_logs USING btree (user_id)` |
| idx_sicoob_order_item_logs_item_id | btree | item_id | não | sim |  | `CREATE INDEX idx_sicoob_order_item_logs_item_id ON public.sicoob_order_item_logs USING btree (item_id)` |
| idx_sicoob_order_item_logs_order_id | btree | order_id | não | sim |  | `CREATE INDEX idx_sicoob_order_item_logs_order_id ON public.sicoob_order_item_logs USING btree (order_id)` |
| sicoob_order_item_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sicoob_order_item_logs_pkey ON public.sicoob_order_item_logs USING btree (id)` |


## Policies (RLS)

### `sicoob_order_item_logs_read_scoped`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `sicoob_current_actor_can_read_order(order_id)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
