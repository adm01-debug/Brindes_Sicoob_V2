# public.sicoob_centrais

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
| usada por views | public.v_sicoob_hierarchy |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `name` | `text` | não |  |  |  |
| 3 | `code` | `text` | sim |  |  |  |
| 4 | `region` | `text` | sim |  |  |  |
| 5 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 6 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 7 | `logo_url` | `text` | sim |  |  |  |
| 8 | `primary_color` | `text` | sim | `'#003641'::text` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sicoob_centrais_code_key | UNIQUE | `UNIQUE (code)` |  |  | sim |
| sicoob_centrais_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.cooperativas | cooperativas_central_id_fkey | central_id | NO ACTION |
| public.pa_singularidades | pa_singularidades_central_id_fkey | central_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| sicoob_centrais_code_key | btree | code | sim | sim |  | `CREATE UNIQUE INDEX sicoob_centrais_code_key ON public.sicoob_centrais USING btree (code)` |
| sicoob_centrais_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sicoob_centrais_pkey ON public.sicoob_centrais USING btree (id)` |


## Policies (RLS)

### `Authenticated read for centrais`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT auth.role() AS role) = 'authenticated'::text)` |
| WITH CHECK |  |

### `sicoob_centrais_admin_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(is_admin(( SELECT auth.uid() AS uid)) AND ((( SELECT auth.jwt() AS jwt) ->> 'aal'::text) = 'aal2'::text))` |
| WITH CHECK |  |

### `sicoob_centrais_admin_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(is_admin(( SELECT auth.uid() AS uid)) AND ((( SELECT auth.jwt() AS jwt) ->> 'aal'::text) = 'aal2'::text))` |

### `sicoob_centrais_admin_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(is_admin(( SELECT auth.uid() AS uid)) AND ((( SELECT auth.jwt() AS jwt) ->> 'aal'::text) = 'aal2'::text))` |
| WITH CHECK | `(is_admin(( SELECT auth.uid() AS uid)) AND ((( SELECT auth.jwt() AS jwt) ->> 'aal'::text) = 'aal2'::text))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_sicoob_centrais_updated_at | BEFORE | UPDATE | ROW | enabled | public.handle_updated_at |


## Grants

_nenhum_
