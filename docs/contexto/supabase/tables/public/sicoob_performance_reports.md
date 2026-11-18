# public.sicoob_performance_reports

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
| 2 | `executed_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 3 | `role_tested` | `text` | não |  |  |  |
| 4 | `table_name` | `text` | não |  |  |  |
| 5 | `execution_plan` | `jsonb` | não |  |  |  |
| 6 | `total_time_ms` | `numeric` | sim |  |  |  |
| 7 | `buffers_read` | `integer` | sim |  |  |  |
| 8 | `buffers_hit` | `integer` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sicoob_performance_reports_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| sicoob_performance_reports_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sicoob_performance_reports_pkey ON public.sicoob_performance_reports USING btree (id)` |


## Policies (RLS)

### `Admins and Devs can view performance reports`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'dev'::app_role))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
