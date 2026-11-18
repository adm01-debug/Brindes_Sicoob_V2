# public.seller_cart_items

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
| 2 | `cart_id` | `uuid` | não |  |  |  |
| 3 | `product_id` | `text` | não |  |  |  |
| 4 | `product_name` | `text` | não |  |  |  |
| 5 | `product_sku` | `text` | sim |  |  |  |
| 6 | `product_image_url` | `text` | sim |  |  |  |
| 7 | `product_price` | `numeric` | não | `0` |  |  |
| 8 | `quantity` | `integer` | não | `1` |  |  |
| 9 | `color_name` | `text` | sim |  |  |  |
| 10 | `color_hex` | `text` | sim |  |  |  |
| 11 | `notes` | `text` | sim |  |  |  |
| 12 | `sort_order` | `integer` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| seller_cart_items_cart_id_fkey | FOREIGN KEY | `FOREIGN KEY (cart_id) REFERENCES seller_carts(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| seller_cart_items_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_seller_cart_items_cart_id | btree | cart_id | não | sim |  | `CREATE INDEX idx_seller_cart_items_cart_id ON public.seller_cart_items USING btree (cart_id)` |
| seller_cart_items_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX seller_cart_items_pkey ON public.seller_cart_items USING btree (id)` |


## Policies (RLS)

### `Users can manage own cart items`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM seller_carts c   WHERE ((c.id = seller_cart_items.cart_id) AND (c.seller_id = ( SELECT auth.uid() AS uid)))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM seller_carts c   WHERE ((c.id = seller_cart_items.cart_id) AND (c.seller_id = ( SELECT auth.uid() AS uid)))))` |


## Triggers

_nenhum_


## Grants

_nenhum_
