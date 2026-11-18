# public.product_views

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | sim |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `product_id` | `text` | sim |  |  |  |
| 3 | `product_sku` | `text` | sim |  |  |  |
| 4 | `product_name` | `text` | sim |  |  |  |
| 5 | `seller_id` | `uuid` | sim |  |  |  |
| 6 | `view_type` | `text` | sim | `'detail'::text` |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_views_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_product_views_created_id | btree | created_at, id | não | sim |  | `CREATE INDEX idx_product_views_created_id ON public.product_views USING btree (created_at DESC, id DESC)` |
| idx_product_views_seller | btree | seller_id, created_at | não | sim |  | `CREATE INDEX idx_product_views_seller ON public.product_views USING btree (seller_id, created_at DESC)` |
| idx_product_views_seller_created_id | btree | seller_id, created_at, id | não | sim |  | `CREATE INDEX idx_product_views_seller_created_id ON public.product_views USING btree (seller_id, created_at DESC, id DESC)` |
| product_views_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_views_pkey ON public.product_views USING btree (id)` |


## Policies (RLS)

### `sicoob_merged_aef7aa2ab8440d8a_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (seller_id = ( SELECT auth.uid() AS uid))))` |
| WITH CHECK |  |

### `sicoob_merged_f460911ac0550d78_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (seller_id = ( SELECT auth.uid() AS uid)))` |


## Triggers

_nenhum_


## Grants

_nenhum_
