# public.collection_items

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `collection_id` | `uuid` | não |  |  |  |
| 3 | `product_id` | `text` | não |  |  |  |
| 4 | `color_name` | `text` | sim |  |  |  |
| 5 | `color_hex` | `text` | sim |  |  |  |
| 6 | `thumbnail_url` | `text` | sim |  |  |  |
| 7 | `sort_order` | `integer` | sim | `0` |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `notes` | `text` | sim |  |  |  |
| 10 | `price_at_save` | `numeric` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| collection_items_collection_id_fkey | FOREIGN KEY | `FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| collection_items_collection_id_product_id_color_name_key | UNIQUE | `UNIQUE (collection_id, product_id, color_name)` |  |  | sim |
| collection_items_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| collection_items_collection_id_product_id_color_name_key | btree | collection_id, product_id, color_name | sim | sim |  | `CREATE UNIQUE INDEX collection_items_collection_id_product_id_color_name_key ON public.collection_items USING btree (collection_id, product_id, color_name)` |
| collection_items_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX collection_items_pkey ON public.collection_items USING btree (id)` |
| idx_collection_items_collection | btree | collection_id, sort_order | não | sim |  | `CREATE INDEX idx_collection_items_collection ON public.collection_items USING btree (collection_id, sort_order)` |
| idx_collection_items_collection_id | btree | collection_id | não | sim |  | `CREATE INDEX idx_collection_items_collection_id ON public.collection_items USING btree (collection_id)` |


## Policies (RLS)

### `sicoob_merged_0e5aeab00e95a25b_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (EXISTS ( SELECT 1    FROM collections   WHERE ((collections.id = collection_items.collection_id) AND (collections.user_id = ( SELECT auth.uid() AS uid))))))` |
| WITH CHECK |  |

### `sicoob_merged_3656fc2a3c330ff5_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((true AND (EXISTS ( SELECT 1    FROM collections c   WHERE ((c.id = collection_items.collection_id) AND (c.is_public = true) AND (c.share_token IS NOT NULL) AND ((c.share_expires_at IS NULL) OR (c.share_expires_at > now())))))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (EXISTS ( SELECT 1    FROM collections   WHERE ((collections.id = collection_items.collection_id) AND (collections.user_id = ( SELECT auth.uid() AS uid)))))))` |
| WITH CHECK |  |

### `sicoob_merged_898c61119e79b2b7_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (EXISTS ( SELECT 1    FROM collections   WHERE ((collections.id = collection_items.collection_id) AND (collections.user_id = ( SELECT auth.uid() AS uid))))))` |

### `sicoob_merged_a664750a7fb26b2e_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (EXISTS ( SELECT 1    FROM collections   WHERE ((collections.id = collection_items.collection_id) AND (collections.user_id = ( SELECT auth.uid() AS uid))))))` |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (EXISTS ( SELECT 1    FROM collections   WHERE ((collections.id = collection_items.collection_id) AND (collections.user_id = ( SELECT auth.uid() AS uid))))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_move_collection_item_to_trash | BEFORE | DELETE | ROW | enabled | public.move_collection_item_to_trash |


## Grants

_nenhum_
