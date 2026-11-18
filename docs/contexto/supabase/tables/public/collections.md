# public.collections

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
| 3 | `name` | `text` | não |  |  |  |
| 4 | `description` | `text` | sim |  |  |  |
| 5 | `is_featured` | `boolean` | não | `false` |  |  |
| 6 | `icon_color` | `text` | sim | `'#3b82f6'::text` |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `icon` | `text` | sim | `'📁'::text` |  |  |
| 10 | `client_id` | `text` | sim |  |  |  |
| 11 | `client_name` | `text` | sim |  |  |  |
| 12 | `share_token` | `text` | sim |  |  |  |
| 13 | `share_expires_at` | `timestamp with time zone` | sim |  |  |  |
| 14 | `is_public` | `boolean` | não | `false` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| collections_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| collections_share_token_key | UNIQUE | `UNIQUE (share_token)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.collection_items | collection_items_collection_id_fkey | collection_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| collections_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX collections_pkey ON public.collections USING btree (id)` |
| collections_share_token_key | btree | share_token | sim | sim |  | `CREATE UNIQUE INDEX collections_share_token_key ON public.collections USING btree (share_token)` |
| idx_collections_client | btree | client_id | não | sim | `(client_id IS NOT NULL)` | `CREATE INDEX idx_collections_client ON public.collections USING btree (client_id) WHERE (client_id IS NOT NULL)` |
| idx_collections_share_token | btree | share_token | não | sim | `(share_token IS NOT NULL)` | `CREATE INDEX idx_collections_share_token ON public.collections USING btree (share_token) WHERE (share_token IS NOT NULL)` |
| idx_collections_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_collections_user_id ON public.collections USING btree (user_id)` |


## Policies (RLS)

### `sicoob_merged_6b6ac692c1f428a0_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (user_id = ( SELECT auth.uid() AS uid)))` |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (user_id = ( SELECT auth.uid() AS uid)))` |

### `sicoob_merged_752834e3bbae67a8_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (user_id = ( SELECT auth.uid() AS uid)))` |
| WITH CHECK |  |

### `sicoob_merged_8781d5844514433c_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (user_id = ( SELECT auth.uid() AS uid)))` |

### `sicoob_merged_f8ae2c6a0c98f062_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((true AND ((is_public = true) AND (share_token IS NOT NULL) AND ((share_expires_at IS NULL) OR (share_expires_at > now())))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (user_id = ( SELECT auth.uid() AS uid))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_owner__collections__user_id | BEFORE | INSERT | ROW | enabled | public.enforce_user_id_owner |
| update_collections_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
