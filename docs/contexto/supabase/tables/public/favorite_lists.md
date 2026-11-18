# public.favorite_lists

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
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `name` | `text` | não | `'Minha lista'::text` |  |  |
| 4 | `description` | `text` | sim |  |  |  |
| 5 | `color` | `text` | não | `'#3B82F6'::text` |  |  |
| 6 | `icon` | `text` | não | `'Heart'::text` |  |  |
| 7 | `is_default` | `boolean` | não | `false` |  |  |
| 8 | `is_archived` | `boolean` | não | `false` |  |  |
| 9 | `client_id` | `text` | sim |  |  |  |
| 10 | `client_name` | `text` | sim |  |  |  |
| 11 | `shared_token` | `text` | sim |  |  |  |
| 12 | `shared_expires_at` | `timestamp with time zone` | sim |  |  |  |
| 13 | `position` | `integer` | não | `0` |  |  |
| 14 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| favorite_lists_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| favorite_lists_shared_token_key | UNIQUE | `UNIQUE (shared_token)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.favorite_item_reactions | favorite_item_reactions_list_id_fkey | list_id | CASCADE |
| public.favorite_items | favorite_items_list_id_fkey | list_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| favorite_lists_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX favorite_lists_pkey ON public.favorite_lists USING btree (id)` |
| favorite_lists_shared_token_key | btree | shared_token | sim | sim |  | `CREATE UNIQUE INDEX favorite_lists_shared_token_key ON public.favorite_lists USING btree (shared_token)` |
| idx_favorite_lists_one_default | btree | user_id | sim | sim | `(is_default = true)` | `CREATE UNIQUE INDEX idx_favorite_lists_one_default ON public.favorite_lists USING btree (user_id) WHERE (is_default = true)` |
| idx_favorite_lists_shared_token | btree | shared_token | não | sim | `(shared_token IS NOT NULL)` | `CREATE INDEX idx_favorite_lists_shared_token ON public.favorite_lists USING btree (shared_token) WHERE (shared_token IS NOT NULL)` |
| idx_favorite_lists_user | btree | user_id, position | não | sim |  | `CREATE INDEX idx_favorite_lists_user ON public.favorite_lists USING btree (user_id, "position")` |


## Policies (RLS)

### `favorite_lists_owner_admin_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((user_id = ( SELECT auth.uid() AS uid)) OR is_admin(auth.uid()))` |
| WITH CHECK |  |

### `sicoob_merged_89309a33ba140376_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (user_id = ( SELECT auth.uid() AS uid)))` |

### `sicoob_merged_9dad3227e42ea54a_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (user_id = ( SELECT auth.uid() AS uid)))` |
| WITH CHECK |  |

### `sicoob_merged_ac64bd241ccd3323_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (user_id = ( SELECT auth.uid() AS uid)))` |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (user_id = ( SELECT auth.uid() AS uid)))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_favorite_lists_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| trg_owner__favorite_lists__user_id | BEFORE | INSERT | ROW | enabled | public.enforce_user_id_owner |


## Grants

_nenhum_
