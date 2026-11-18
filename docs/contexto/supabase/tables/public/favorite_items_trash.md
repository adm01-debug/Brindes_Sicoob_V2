# public.favorite_items_trash

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
| 2 | `original_id` | `uuid` | não |  |  |  |
| 3 | `list_id` | `uuid` | não |  |  |  |
| 4 | `user_id` | `uuid` | não |  |  |  |
| 5 | `product_id` | `text` | não |  |  |  |
| 6 | `variant_id` | `text` | sim |  |  |  |
| 7 | `variant_info` | `jsonb` | sim |  |  |  |
| 8 | `note` | `text` | sim |  |  |  |
| 9 | `price_at_save` | `numeric(12,2)` | sim |  |  |  |
| 10 | `deleted_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `expires_at` | `timestamp with time zone` | não | `(now() + '30 days'::interval)` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| favorite_items_trash_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| favorite_items_trash_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX favorite_items_trash_pkey ON public.favorite_items_trash USING btree (id)` |
| idx_favorite_items_trash_expires | btree | expires_at | não | sim |  | `CREATE INDEX idx_favorite_items_trash_expires ON public.favorite_items_trash USING btree (expires_at)` |
| idx_favorite_items_trash_user | btree | user_id, deleted_at | não | sim |  | `CREATE INDEX idx_favorite_items_trash_user ON public.favorite_items_trash USING btree (user_id, deleted_at DESC)` |


## Policies (RLS)

### `Users manage own trash`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(user_id = ( SELECT auth.uid() AS uid))` |
| WITH CHECK | `(user_id = ( SELECT auth.uid() AS uid))` |


## Triggers

_nenhum_


## Grants

_nenhum_
