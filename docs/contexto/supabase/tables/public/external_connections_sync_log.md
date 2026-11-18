# public.external_connections_sync_log

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
| 2 | `ran_at` | `timestamp with time zone` | não | `now()` |  |  |
| 3 | `triggered_by_user_id` | `uuid` | sim |  |  |  |
| 4 | `triggered_by_secret_name` | `text` | sim |  |  |  |
| 5 | `trigger_op` | `text` | sim |  |  |  |
| 6 | `processed` | `integer` | não | `0` |  |  |
| 7 | `created_count` | `integer` | não | `0` |  |  |
| 8 | `updated_count` | `integer` | não | `0` |  |  |
| 9 | `status` | `text` | não | `'ok'::text` |  |  |
| 10 | `error_message` | `text` | sim |  |  |  |
| 11 | `duration_ms` | `integer` | sim |  |  |  |
| 12 | `details` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| external_connections_sync_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| external_connections_sync_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX external_connections_sync_log_pkey ON public.external_connections_sync_log USING btree (id)` |
| idx_ext_conn_sync_log_ran_at | btree | ran_at | não | sim |  | `CREATE INDEX idx_ext_conn_sync_log_ran_at ON public.external_connections_sync_log USING btree (ran_at DESC)` |
| idx_ext_conn_sync_log_secret | btree | triggered_by_secret_name | não | sim |  | `CREATE INDEX idx_ext_conn_sync_log_secret ON public.external_connections_sync_log USING btree (triggered_by_secret_name)` |


## Policies (RLS)

### `Supervisores leem external_connections_sync_log`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_supervisor_or_above(( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
