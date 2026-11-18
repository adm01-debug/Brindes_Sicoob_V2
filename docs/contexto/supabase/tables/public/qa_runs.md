# public.qa_runs

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `started_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 3 | `finished_at` | `timestamp with time zone` | sim |  |  |  |
| 4 | `status` | `text` | não | `'running'::text` |  |  |
| 5 | `persona` | `text` | sim |  |  |  |
| 6 | `scenario` | `text` | sim |  |  |  |
| 7 | `report` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 8 | `error` | `text` | sim |  |  |  |
| 9 | `executed_by` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| qa_runs_executed_by_fkey | FOREIGN KEY | `FOREIGN KEY (executed_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| qa_runs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.qa_run_steps | qa_run_steps_run_id_fkey | run_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_fk_qa_runs_executed_by_fkey | btree | executed_by | não | sim |  | `CREATE INDEX idx_fk_qa_runs_executed_by_fkey ON public.qa_runs USING btree (executed_by)` |
| qa_runs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX qa_runs_pkey ON public.qa_runs USING btree (id)` |


## Policies (RLS)

### `Apenas administradores podem inserir execuções de QA`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'dev'::app_role))` |

### `Apenas administradores podem ver execuções de QA`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'dev'::app_role))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
