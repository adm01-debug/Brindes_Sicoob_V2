# public.city_whitelist

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
| 2 | `city_name` | `text` | não |  |  |  |
| 3 | `state` | `text` | sim |  |  |  |
| 4 | `country_code` | `text` | não | `'BR'::text` |  |  |
| 5 | `is_active` | `boolean` | não | `true` |  |  |
| 6 | `created_by` | `uuid` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| city_whitelist_city_name_state_country_code_key | UNIQUE | `UNIQUE (city_name, state, country_code)` |  |  | sim |
| city_whitelist_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| city_whitelist_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| city_whitelist_city_name_state_country_code_key | btree | city_name, state, country_code | sim | sim |  | `CREATE UNIQUE INDEX city_whitelist_city_name_state_country_code_key ON public.city_whitelist USING btree (city_name, state, country_code)` |
| city_whitelist_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX city_whitelist_pkey ON public.city_whitelist USING btree (id)` |
| idx_city_whitelist_lookup | btree | country_code, is_active | não | sim | `(is_active = true)` | `CREATE INDEX idx_city_whitelist_lookup ON public.city_whitelist USING btree (country_code, is_active) WHERE (is_active = true)` |
| idx_fk_city_whitelist_created_by_fkey | btree | created_by | não | sim |  | `CREATE INDEX idx_fk_city_whitelist_created_by_fkey ON public.city_whitelist USING btree (created_by)` |


## Policies (RLS)

### `Admin manage city whitelist`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `can_manage(( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
