# public.user_comparisons

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
| 3 | `client_id` | `text` | sim |  |  |  |
| 4 | `client_name` | `text` | sim |  |  |  |
| 5 | `name` | `text` | sim |  |  |  |
| 6 | `items` | `jsonb` | não | `'[]'::jsonb` |  |  |
| 7 | `share_token` | `text` | sim |  |  |  |
| 8 | `is_public` | `boolean` | não | `false` |  |  |
| 9 | `share_expires_at` | `timestamp with time zone` | sim |  |  |  |
| 10 | `view_count` | `integer` | não | `0` |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| user_comparisons_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| user_comparisons_share_token_key | UNIQUE | `UNIQUE (share_token)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.comparison_reactions | comparison_reactions_comparison_id_fkey | comparison_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_user_comparisons_public | btree | is_public, share_expires_at | não | sim | `(is_public = true)` | `CREATE INDEX idx_user_comparisons_public ON public.user_comparisons USING btree (is_public, share_expires_at) WHERE (is_public = true)` |
| idx_user_comparisons_token | btree | share_token | não | sim | `(share_token IS NOT NULL)` | `CREATE INDEX idx_user_comparisons_token ON public.user_comparisons USING btree (share_token) WHERE (share_token IS NOT NULL)` |
| idx_user_comparisons_user | btree | user_id, updated_at | não | sim |  | `CREATE INDEX idx_user_comparisons_user ON public.user_comparisons USING btree (user_id, updated_at DESC)` |
| user_comparisons_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX user_comparisons_pkey ON public.user_comparisons USING btree (id)` |
| user_comparisons_share_token_key | btree | share_token | sim | sim |  | `CREATE UNIQUE INDEX user_comparisons_share_token_key ON public.user_comparisons USING btree (share_token)` |


## Policies (RLS)

### `sicoob_merged_866e772e7e315091_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((true AND ((is_public = true) AND (share_token IS NOT NULL) AND ((share_expires_at IS NULL) OR (share_expires_at > now())))) OR (true AND (( SELECT auth.uid() AS uid) = user_id)))` |
| WITH CHECK |  |

### `sicoob_merged_a8d374a2bb3e1e02_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(true AND (( SELECT auth.uid() AS uid) = user_id))` |
| WITH CHECK | `(true AND (( SELECT auth.uid() AS uid) = user_id))` |

### `sicoob_merged_c60aa6208de4f838_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(true AND (( SELECT auth.uid() AS uid) = user_id))` |
| WITH CHECK |  |

### `sicoob_merged_d381be3d0d4cdecf_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(true AND (( SELECT auth.uid() AS uid) = user_id))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_user_comparisons_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
