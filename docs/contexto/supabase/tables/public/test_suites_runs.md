# public.test_suites_runs

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
| 2 | `test_type` | `text` | não |  |  |  |
| 3 | `results` | `jsonb` | não |  |  |  |
| 4 | `metadata` | `jsonb` | sim |  |  |  |
| 5 | `executed_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| test_suites_runs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| test_suites_runs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX test_suites_runs_pkey ON public.test_suites_runs USING btree (id)` |


## Policies (RLS)

### `Admins can manage test results`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'service_role'::text) OR (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
