# public.cart_items

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
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `product_id` | `text` | não |  |  |  |
| 4 | `product_name` | `text` | não |  |  |  |
| 5 | `product_image_url` | `text` | sim |  |  |  |
| 6 | `product_price` | `numeric` | não |  |  |  |
| 7 | `quantity` | `integer` | não | `1` |  |  |
| 8 | `color_name` | `text` | sim |  |  |  |
| 9 | `color_hex` | `text` | sim |  |  |  |
| 10 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| cart_items_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| cart_items_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| cart_items_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX cart_items_pkey ON public.cart_items USING btree (id)` |
| idx_fk_cart_items_user_id_fkey | btree | user_id | não | sim |  | `CREATE INDEX idx_fk_cart_items_user_id_fkey ON public.cart_items USING btree (user_id)` |


## Policies (RLS)

### `Users can manage their own cart items`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK | `(( SELECT auth.uid() AS uid) = user_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_cart_items_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
