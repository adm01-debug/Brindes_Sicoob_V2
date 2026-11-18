# public.custom_kits

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | sim |
| replica identity | full |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `name` | `text` | não | `'Kit sem nome'::text` |  |  |
| 4 | `status` | `text` | não | `'draft'::text` |  |  |
| 5 | `box_data` | `jsonb` | sim |  |  |  |
| 6 | `items_data` | `jsonb` | não | `'[]'::jsonb` |  |  |
| 7 | `personalization_data` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 8 | `kit_quantity` | `integer` | não | `1` |  |  |
| 9 | `box_price` | `numeric` | não | `0` |  |  |
| 10 | `items_price` | `numeric` | não | `0` |  |  |
| 11 | `personalization_price` | `numeric` | não | `0` |  |  |
| 12 | `total_price` | `numeric` | não | `0` |  |  |
| 13 | `volume_usage_percent` | `numeric` | não | `0` |  |  |
| 14 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 16 | `kit_type` | `text` | não | `'montado'::text` |  |  |
| 17 | `color` | `text` | não | `'#3B82F6'::text` |  |  |
| 18 | `tag` | `text` | sim |  |  |  |
| 19 | `icon` | `text` | não | `'Package'::text` |  |  |
| 20 | `description` | `text` | sim |  |  |  |
| 21 | `is_favorite` | `boolean` | não | `false` |  |  |
| 22 | `last_used_at` | `timestamp with time zone` | sim |  |  |  |
| 23 | `is_pinned` | `boolean` | não | `false` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| custom_kits_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.kit_collaborators | kit_collaborators_kit_id_fkey | kit_id | CASCADE |
| public.kit_comments | kit_comments_kit_id_fkey | kit_id | CASCADE |
| public.kit_share_tokens | kit_share_tokens_kit_id_fkey | kit_id | CASCADE |
| public.kit_variants | kit_variants_kit_master_id_fkey | kit_master_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| custom_kits_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX custom_kits_pkey ON public.custom_kits USING btree (id)` |
| idx_custom_kits_one_pinned_per_user | btree | user_id | sim | sim | `is_pinned` | `CREATE UNIQUE INDEX idx_custom_kits_one_pinned_per_user ON public.custom_kits USING btree (user_id) WHERE is_pinned` |
| idx_custom_kits_tag | btree | tag | não | sim |  | `CREATE INDEX idx_custom_kits_tag ON public.custom_kits USING btree (tag)` |
| idx_custom_kits_user_favorite | btree | user_id, is_favorite | não | sim | `(is_favorite = true)` | `CREATE INDEX idx_custom_kits_user_favorite ON public.custom_kits USING btree (user_id, is_favorite) WHERE (is_favorite = true)` |
| idx_custom_kits_user_pinned | btree | user_id, is_pinned, last_used_at | não | sim |  | `CREATE INDEX idx_custom_kits_user_pinned ON public.custom_kits USING btree (user_id, is_pinned DESC, last_used_at DESC NULLS LAST)` |


## Policies (RLS)

### `sicoob_merged_539e08070cdd273f_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND ((user_id = ( SELECT auth.uid() AS uid)) OR is_admin(( SELECT auth.uid() AS uid))))` |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND ((user_id = ( SELECT auth.uid() AS uid)) OR is_admin(( SELECT auth.uid() AS uid))))` |

### `sicoob_merged_86cc0769fccb946f_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND ((user_id = ( SELECT auth.uid() AS uid)) OR is_admin(( SELECT auth.uid() AS uid))))` |
| WITH CHECK |  |

### `sicoob_merged_dda365d028190455_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND ((user_id = ( SELECT auth.uid() AS uid)) OR is_admin(( SELECT auth.uid() AS uid)))))` |
| WITH CHECK |  |

### `sicoob_merged_e3500f62ce9e177e_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND ((user_id = ( SELECT auth.uid() AS uid)) OR is_admin(( SELECT auth.uid() AS uid))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_owner__custom_kits__user_id | BEFORE | INSERT | ROW | enabled | public.enforce_user_id_owner |
| trg_validate_kit_status | BEFORE | INSERT OR UPDATE | ROW | enabled | public.validate_status_fields |


## Grants

_nenhum_
