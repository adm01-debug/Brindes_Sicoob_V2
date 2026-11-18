# public.profiles

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.v_full_scope_grants |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `email` | `text` | sim |  |  |  |
| 4 | `full_name` | `text` | sim |  |  |  |
| 5 | `role` | `text` | sim | `'vendedor'::text` |  |  |
| 6 | `avatar_url` | `text` | sim |  |  |  |
| 7 | `phone` | `text` | sim |  |  |  |
| 8 | `department` | `text` | sim |  |  |  |
| 9 | `is_active` | `boolean` | sim | `true` |  |  |
| 10 | `last_login_at` | `timestamp with time zone` | sim |  |  |  |
| 11 | `preferences` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `cooperativa_id` | `uuid` | sim |  |  |  |
| 15 | `pa_id` | `uuid` | sim |  |  |  |
| 16 | `approval_threshold` | `numeric` | sim | `5000` |  |  |
| 17 | `quote_preferences` | `jsonb` | sim | `'{"showPhotos": true, "showPrices": true, "showTotals": true}'::jsonb` |  |  |
| 18 | `deleted_at` | `timestamp with time zone` | sim |  |  |  |
| 19 | `singular_id` | `uuid` | sim |  |  |  |
| 20 | `carteira_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| profiles_cooperativa_id_fkey | FOREIGN KEY | `FOREIGN KEY (cooperativa_id) REFERENCES cooperativas(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| profiles_pa_id_fkey | FOREIGN KEY | `FOREIGN KEY (pa_id) REFERENCES postos_atendimento(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| profiles_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| profiles_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| profiles_user_id_key | UNIQUE | `UNIQUE (user_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_profiles_cooperativa_id | btree | cooperativa_id | não | sim |  | `CREATE INDEX idx_profiles_cooperativa_id ON public.profiles USING btree (cooperativa_id)` |
| idx_profiles_pa_id | btree | pa_id | não | sim |  | `CREATE INDEX idx_profiles_pa_id ON public.profiles USING btree (pa_id)` |
| idx_profiles_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_profiles_user_id ON public.profiles USING btree (user_id)` |
| profiles_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id)` |
| profiles_user_id_key | btree | user_id | sim | sim |  | `CREATE UNIQUE INDEX profiles_user_id_key ON public.profiles USING btree (user_id)` |


## Policies (RLS)

### `sicoob_merged_49a6a498d072653c_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'supervisor'::app_role) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (user_id = ( SELECT auth.uid() AS uid))))` |
| WITH CHECK | `(has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'supervisor'::app_role) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (user_id = ( SELECT auth.uid() AS uid))))` |

### `sicoob_merged_6cb97c2b3609c788_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (user_id = ( SELECT auth.uid() AS uid)))` |

### `sicoob_merged_d38c7a219485f8e9_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((true AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (is_gerente_pa() AND (pa_id = current_user_pa_id()))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (is_gestor_compras() AND (cooperativa_id = current_user_cooperativa_id()))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND ((user_id = ( SELECT auth.uid() AS uid)) OR is_admin(( SELECT auth.uid() AS uid)))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| aaa_guard_profile_authority_fields | BEFORE | INSERT OR UPDATE | ROW | enabled | public.guard_profile_authority_fields |
| prevent_profile_role_change_trigger | BEFORE | UPDATE | ROW | enabled | public.prevent_profile_role_change |
| trg_prevent_role_self_update | BEFORE | UPDATE | ROW | enabled | public.prevent_role_self_update |
| update_profiles_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
