# public.optimization_queue_runs

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
| 2 | `queue_id` | `uuid` | não |  |  |  |
| 3 | `status` | `text` | não |  |  |  |
| 4 | `notes` | `text` | sim |  |  |  |
| 5 | `guardrail_status` | `text` | sim |  |  |  |
| 6 | `duration_ms` | `integer` | sim |  |  |  |
| 7 | `executed_by` | `uuid` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| optimization_queue_runs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| optimization_queue_runs_queue_id_fkey | FOREIGN KEY | `FOREIGN KEY (queue_id) REFERENCES optimization_queue(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_optimization_queue_runs_queue | btree | queue_id, created_at | não | sim |  | `CREATE INDEX idx_optimization_queue_runs_queue ON public.optimization_queue_runs USING btree (queue_id, created_at DESC)` |
| optimization_queue_runs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX optimization_queue_runs_pkey ON public.optimization_queue_runs USING btree (id)` |


## Policies (RLS)

### `Admins manage optimization runs`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin(( SELECT auth.uid() AS uid))` |
| WITH CHECK | `is_admin(( SELECT auth.uid() AS uid))` |


## Triggers

_nenhum_


## Grants

_nenhum_
