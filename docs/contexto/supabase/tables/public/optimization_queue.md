# public.optimization_queue

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
| 2 | `title` | `text` | não |  |  |  |
| 3 | `description` | `text` | sim |  |  |  |
| 4 | `category` | `text` | não | `'performance'::text` |  |  |
| 5 | `priority` | `integer` | não | `100` |  |  |
| 6 | `status` | `text` | não | `'pending'::text` |  |  |
| 7 | `result` | `jsonb` | sim |  |  |  |
| 8 | `error` | `text` | sim |  |  |  |
| 9 | `guardrail_status` | `text` | sim |  |  |  |
| 10 | `started_at` | `timestamp with time zone` | sim |  |  |  |
| 11 | `finished_at` | `timestamp with time zone` | sim |  |  |  |
| 12 | `created_by` | `uuid` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| optimization_queue_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| optimization_queue_status_check | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'running'::text, 'done'::text, 'failed'::text, 'skipped'::text, 'blocked'::text]))` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.optimization_queue_runs | optimization_queue_runs_queue_id_fkey | queue_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_optimization_queue_status_priority | btree | status, priority, created_at | não | sim |  | `CREATE INDEX idx_optimization_queue_status_priority ON public.optimization_queue USING btree (status, priority, created_at)` |
| optimization_queue_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX optimization_queue_pkey ON public.optimization_queue USING btree (id)` |


## Policies (RLS)

### `Devs manage optimization queue`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_dev(( SELECT auth.uid() AS uid))` |
| WITH CHECK | `is_dev(( SELECT auth.uid() AS uid))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_optimization_queue_updated_at | BEFORE | UPDATE | ROW | enabled | public.set_optimization_queue_updated_at |


## Grants

_nenhum_
