# public.sicoob_order_history

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `order_id` | `uuid` | sim |  |  |  |
| 3 | `user_id` | `uuid` | sim |  |  |  |
| 4 | `previous_status` | `text` | sim |  |  |  |
| 5 | `new_status` | `text` | não |  |  |  |
| 6 | `comment` | `text` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sicoob_order_history_order_id_fkey | FOREIGN KEY | `FOREIGN KEY (order_id) REFERENCES sicoob_orders(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| sicoob_order_history_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sicoob_order_history_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_fk_sicoob_order_history_user_id_fkey | btree | user_id | não | sim |  | `CREATE INDEX idx_fk_sicoob_order_history_user_id_fkey ON public.sicoob_order_history USING btree (user_id)` |
| idx_sicoob_order_history_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_sicoob_order_history_created_at ON public.sicoob_order_history USING btree (created_at DESC)` |
| idx_sicoob_order_history_order_id | btree | order_id | não | sim |  | `CREATE INDEX idx_sicoob_order_history_order_id ON public.sicoob_order_history USING btree (order_id)` |
| sicoob_order_history_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sicoob_order_history_pkey ON public.sicoob_order_history USING btree (id)` |


## Policies (RLS)

### `Users can insert order history`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(( SELECT auth.uid() AS uid) = user_id)` |

### `sicoob_order_history_read_scoped`

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
