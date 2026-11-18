# public.favorite_items

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
| 2 | `list_id` | `uuid` | não |  |  |  |
| 3 | `user_id` | `uuid` | não |  |  |  |
| 4 | `product_id` | `text` | não |  |  |  |
| 5 | `variant_id` | `text` | sim |  |  |  |
| 6 | `variant_info` | `jsonb` | sim |  |  |  |
| 7 | `note` | `text` | sim |  |  |  |
| 8 | `price_at_save` | `numeric(12,2)` | sim |  |  |  |
| 9 | `position` | `integer` | não | `0` |  |  |
| 10 | `added_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| favorite_items_list_id_fkey | FOREIGN KEY | `FOREIGN KEY (list_id) REFERENCES favorite_lists(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| favorite_items_list_product_variant_key | UNIQUE | `UNIQUE NULLS NOT DISTINCT (list_id, product_id, variant_id)` |  |  | sim |
| favorite_items_note_check | CHECK | `CHECK (char_length(note) <= 280)` |  |  | sim |
| favorite_items_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.favorite_item_reactions | favorite_item_reactions_item_id_fkey | item_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| favorite_items_list_product_variant_key | btree | list_id, product_id, variant_id | sim | sim |  | `CREATE UNIQUE INDEX favorite_items_list_product_variant_key ON public.favorite_items USING btree (list_id, product_id, variant_id) NULLS NOT DISTINCT` |
| favorite_items_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX favorite_items_pkey ON public.favorite_items USING btree (id)` |
| idx_favorite_items_list | btree | list_id, position | não | sim |  | `CREATE INDEX idx_favorite_items_list ON public.favorite_items USING btree (list_id, "position")` |
| idx_favorite_items_product | btree | product_id | não | sim |  | `CREATE INDEX idx_favorite_items_product ON public.favorite_items USING btree (product_id)` |
| idx_favorite_items_user | btree | user_id | não | sim |  | `CREATE INDEX idx_favorite_items_user ON public.favorite_items USING btree (user_id)` |


## Policies (RLS)

### `favorite_items_owner_admin_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((user_id = ( SELECT auth.uid() AS uid)) OR is_admin(auth.uid()))` |
| WITH CHECK |  |

### `sicoob_merged_6b3081c6baddbc2a_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (user_id = ( SELECT auth.uid() AS uid)))` |

### `sicoob_merged_a5104d20a8a5fc6a_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (user_id = ( SELECT auth.uid() AS uid)))` |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (user_id = ( SELECT auth.uid() AS uid)))` |

### `sicoob_merged_eb8139d42bfdee10_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (user_id = ( SELECT auth.uid() AS uid)))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_favorite_items_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| trg_favorite_items_to_trash | BEFORE | DELETE | ROW | enabled | public.move_favorite_to_trash |
| trg_owner__favorite_items__user_id | BEFORE | INSERT | ROW | enabled | public.enforce_user_id_owner |


## Grants

_nenhum_
