# public.cms_config

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
| 1 | `key` | `text` | não |  |  |  |
| 2 | `value` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 3 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 4 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| cms_config_pkey | PRIMARY KEY | `PRIMARY KEY (key)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| cms_config_pkey | btree | key | sim | sim |  | `CREATE UNIQUE INDEX cms_config_pkey ON public.cms_config USING btree (key)` |


## Policies (RLS)

### `sicoob_merged_06e7f2f1c398d1c4_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superuser'::text])))))) OR (true AND true))` |
| WITH CHECK |  |

### `sicoob_merged_164584c788d1a92f_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superuser'::text]))))))` |

### `sicoob_merged_42d41fced40e3c7c_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superuser'::text]))))))` |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superuser'::text]))))))` |

### `sicoob_merged_658dfb00d0f02c7d_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superuser'::text]))))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_cms_config_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
