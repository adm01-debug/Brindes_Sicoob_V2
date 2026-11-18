# public.access_security_settings

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
| 2 | `ip_whitelist_enabled` | `boolean` | não | `false` |  |  |
| 3 | `city_whitelist_enabled` | `boolean` | não | `false` |  |  |
| 4 | `block_unknown_locations` | `boolean` | não | `false` |  |  |
| 5 | `max_failed_attempts` | `integer` | não | `5` |  |  |
| 6 | `lockout_duration_minutes` | `integer` | não | `15` |  |  |
| 7 | `updated_by` | `uuid` | sim |  |  |  |
| 8 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| access_security_settings_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| access_security_settings_updated_by_fkey | FOREIGN KEY | `FOREIGN KEY (updated_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| access_security_settings_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX access_security_settings_pkey ON public.access_security_settings USING btree (id)` |
| idx_fk_access_security_settings_updated_by_fkey | btree | updated_by | não | sim |  | `CREATE INDEX idx_fk_access_security_settings_updated_by_fkey ON public.access_security_settings USING btree (updated_by)` |


## Policies (RLS)

### `admin_manage_access_security_settings`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM user_roles ur   WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND ((ur.role)::text = ANY (ARRAY['admin'::text, 'dev'::text])))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM user_roles ur   WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND ((ur.role)::text = ANY (ARRAY['admin'::text, 'dev'::text])))))` |


## Triggers

_nenhum_


## Grants

_nenhum_
