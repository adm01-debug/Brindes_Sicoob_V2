# public.qa_rls_audits

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
| 2 | `audited_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 3 | `tables_total` | `integer` | não |  |  |  |
| 4 | `tables_with_rls` | `integer` | não |  |  |  |
| 5 | `tables_missing_rls` | `text[]` | sim | `'{}'::text[]` |  |  |
| 6 | `tables_permissive_rls` | `text[]` | sim | `'{}'::text[]` |  |  |
| 7 | `score` | `numeric(5,2)` | não |  |  |  |
| 8 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| qa_rls_audits_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| qa_rls_audits_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX qa_rls_audits_pkey ON public.qa_rls_audits USING btree (id)` |


## Policies (RLS)

### `Admins can manage RLS audits`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
