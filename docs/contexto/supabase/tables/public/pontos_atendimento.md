# public.pontos_atendimento

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
| 2 | `singular_id` | `uuid` | sim |  |  |  |
| 3 | `name` | `text` | não |  |  |  |
| 4 | `code` | `text` | sim |  |  |  |
| 5 | `address` | `text` | sim |  |  |  |
| 6 | `city` | `text` | sim |  |  |  |
| 7 | `state` | `text` | sim |  |  |  |
| 8 | `is_active` | `boolean` | sim | `true` |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| pontos_atendimento_code_key | UNIQUE | `UNIQUE (code)` |  |  | sim |
| pontos_atendimento_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| pontos_atendimento_singular_id_fkey | FOREIGN KEY | `FOREIGN KEY (singular_id) REFERENCES pa_singularidades(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_fk_pontos_atendimento_singular_id_fkey | btree | singular_id | não | sim |  | `CREATE INDEX idx_fk_pontos_atendimento_singular_id_fkey ON public.pontos_atendimento USING btree (singular_id)` |
| pontos_atendimento_code_key | btree | code | sim | sim |  | `CREATE UNIQUE INDEX pontos_atendimento_code_key ON public.pontos_atendimento USING btree (code)` |
| pontos_atendimento_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX pontos_atendimento_pkey ON public.pontos_atendimento USING btree (id)` |


## Policies (RLS)

### `sicoob_merged_3dcad04a9e968c17_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(true AND (EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['admin'::app_role, 'dev'::app_role]))))))` |
| WITH CHECK |  |

### `sicoob_merged_553eb25fa5255f57_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(true AND (EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['admin'::app_role, 'dev'::app_role]))))))` |
| WITH CHECK | `(true AND (EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['admin'::app_role, 'dev'::app_role]))))))` |

### `sicoob_merged_accc35cdfa70dbbe_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((true AND (EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['admin'::app_role, 'dev'::app_role])))))) OR (true AND true))` |
| WITH CHECK |  |

### `sicoob_merged_e5d15c576fbf5c18_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(true AND (EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['admin'::app_role, 'dev'::app_role]))))))` |


## Triggers

_nenhum_


## Grants

_nenhum_
