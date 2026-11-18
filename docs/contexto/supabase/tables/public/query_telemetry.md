# public.query_telemetry

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.telemetry_query_performance |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `operation` | `text` | não |  |  |  |
| 3 | `table_name` | `text` | sim |  |  |  |
| 4 | `rpc_name` | `text` | sim |  |  |  |
| 5 | `duration_ms` | `integer` | não |  |  |  |
| 6 | `record_count` | `integer` | sim |  |  |  |
| 7 | `query_limit` | `integer` | sim |  |  |  |
| 8 | `query_offset` | `integer` | sim |  |  |  |
| 9 | `count_mode` | `text` | sim |  |  |  |
| 10 | `severity` | `text` | não | `'slow'::text` |  |  |
| 11 | `error_message` | `text` | sim |  |  |  |
| 12 | `user_id` | `uuid` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `error_kind` | `text` | sim |  |  |  |
| 15 | `retry_count` | `integer` | não | `0` |  |  |
| 16 | `cache_hit` | `boolean` | não | `false` |  |  |
| 17 | `is_cold_start` | `boolean` | não | `false` |  |  |
| 18 | `is_503` | `boolean` | não | `false` |  |  |
| 19 | `error_code` | `text` | sim |  |  |  |
| 20 | `is_rls_violation` | `boolean` | sim | `false` |  |  |
| 21 | `rls_blocked_count` | `integer` | sim | `0` |  |  |
| 22 | `request_id` | `text` | sim |  |  |  |
| 23 | `trace_id` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| query_telemetry_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_query_telemetry_cache_hit_created | btree | cache_hit, created_at | não | sim | `(cache_hit = true)` | `CREATE INDEX idx_query_telemetry_cache_hit_created ON public.query_telemetry USING btree (cache_hit, created_at DESC) WHERE (cache_hit = true)` |
| idx_query_telemetry_created | btree | created_at | não | sim |  | `CREATE INDEX idx_query_telemetry_created ON public.query_telemetry USING btree (created_at DESC)` |
| idx_query_telemetry_error_kind_created | btree | error_kind, created_at | não | sim | `(error_kind IS NOT NULL)` | `CREATE INDEX idx_query_telemetry_error_kind_created ON public.query_telemetry USING btree (error_kind, created_at DESC) WHERE (error_kind IS NOT NULL)` |
| idx_query_telemetry_op_table_created | btree | operation, table_name, created_at | não | sim |  | `CREATE INDEX idx_query_telemetry_op_table_created ON public.query_telemetry USING btree (operation, table_name, created_at DESC)` |
| idx_query_telemetry_platform_failures | btree | created_at | não | sim | `((is_503 = true) OR (is_cold_start = true))` | `CREATE INDEX idx_query_telemetry_platform_failures ON public.query_telemetry USING btree (created_at DESC) WHERE ((is_503 = true) OR (is_cold_start = true))` |
| idx_query_telemetry_request_id | btree | request_id | não | sim |  | `CREATE INDEX idx_query_telemetry_request_id ON public.query_telemetry USING btree (request_id)` |
| idx_query_telemetry_retry_count_created | btree | retry_count, created_at | não | sim | `(retry_count > 0)` | `CREATE INDEX idx_query_telemetry_retry_count_created ON public.query_telemetry USING btree (retry_count, created_at DESC) WHERE (retry_count > 0)` |
| idx_query_telemetry_severity | btree | severity, created_at | não | sim |  | `CREATE INDEX idx_query_telemetry_severity ON public.query_telemetry USING btree (severity, created_at DESC)` |
| query_telemetry_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX query_telemetry_pkey ON public.query_telemetry USING btree (id)` |


## Policies (RLS)

### `Authenticated users can insert own telemetry`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(user_id = ( SELECT auth.uid() AS uid))` |

### `Devs can delete telemetry`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_dev(( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |

### `Devs can read telemetry`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_dev(( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
