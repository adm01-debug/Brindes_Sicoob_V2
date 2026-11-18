# public.pa_singularidades

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
| 2 | `name` | `text` | não |  |  |  |
| 3 | `code` | `text` | sim |  |  |  |
| 4 | `is_active` | `boolean` | sim | `true` |  |  |
| 5 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 6 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `central_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| pa_singularidades_central_id_fkey | FOREIGN KEY | `FOREIGN KEY (central_id) REFERENCES sicoob_centrais(id)` | NO ACTION | NO ACTION | sim |
| pa_singularidades_code_key | UNIQUE | `UNIQUE (code)` |  |  | sim |
| pa_singularidades_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.pontos_atendimento | pontos_atendimento_singular_id_fkey | singular_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_fk_pa_singularidades_central_id_fkey | btree | central_id | não | sim |  | `CREATE INDEX idx_fk_pa_singularidades_central_id_fkey ON public.pa_singularidades USING btree (central_id)` |
| pa_singularidades_code_key | btree | code | sim | sim |  | `CREATE UNIQUE INDEX pa_singularidades_code_key ON public.pa_singularidades USING btree (code)` |
| pa_singularidades_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX pa_singularidades_pkey ON public.pa_singularidades USING btree (id)` |


## Policies (RLS)

### `sicoob_merged_22fc7a23606ab25d_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((true AND (EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['admin'::app_role, 'dev'::app_role])))))) OR (true AND true))` |
| WITH CHECK |  |

### `sicoob_merged_6e0b5897d7d3da98_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(true AND (EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['admin'::app_role, 'dev'::app_role]))))))` |

### `sicoob_merged_a75d9d2c389f2daf_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(true AND (EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['admin'::app_role, 'dev'::app_role]))))))` |
| WITH CHECK |  |

### `sicoob_merged_eaaa23730c71c651_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(true AND (EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['admin'::app_role, 'dev'::app_role]))))))` |
| WITH CHECK | `(true AND (EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['admin'::app_role, 'dev'::app_role]))))))` |


## Triggers

_nenhum_


## Grants

_nenhum_
