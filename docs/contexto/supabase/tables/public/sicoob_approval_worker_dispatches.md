# public.sicoob_approval_worker_dispatches

> Despachos do worker de aprovacoes. timed_out de despacho sem entrega pendente e perda de resposta do pg_net, nao falha de entrega.

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
| 2 | `request_id` | `bigint` | não |  |  |  |
| 3 | `state` | `text` | não | `'queued'::text` |  |  |
| 4 | `status_code` | `integer` | sim |  |  |  |
| 5 | `error_message` | `text` | sim |  |  |  |
| 6 | `requested_at` | `timestamp with time zone` | não | `clock_timestamp()` |  |  |
| 7 | `completed_at` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sicoob_approval_worker_dispatches_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sicoob_approval_worker_dispatches_state_check | CHECK | `CHECK (state = ANY (ARRAY['queued'::text, 'succeeded'::text, 'failed'::text, 'timed_out'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sicoob_approval_worker_dispatch_state | btree | state, requested_at | não | sim |  | `CREATE INDEX idx_sicoob_approval_worker_dispatch_state ON public.sicoob_approval_worker_dispatches USING btree (state, requested_at)` |
| idx_sicoob_approval_worker_queued_request | btree | request_id, requested_at | não | sim | `(state = 'queued'::text)` | `CREATE INDEX idx_sicoob_approval_worker_queued_request ON public.sicoob_approval_worker_dispatches USING btree (request_id, requested_at DESC) WHERE (state = 'queued'::text)` |
| sicoob_approval_worker_dispatches_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sicoob_approval_worker_dispatches_pkey ON public.sicoob_approval_worker_dispatches USING btree (id)` |


## Policies (RLS)

### `deny_non_service_role`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | RESTRICTIVE |
| roles | public |
| USING | `false` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
