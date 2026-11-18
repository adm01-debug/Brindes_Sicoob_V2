# public.request_rate_limits

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
| 2 | `identifier` | `text` | não |  |  |  |
| 3 | `endpoint` | `text` | não |  |  |  |
| 4 | `request_count` | `integer` | não | `1` |  |  |
| 5 | `window_start` | `timestamp with time zone` | não | `now()` |  |  |
| 6 | `blocked_until` | `timestamp with time zone` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| request_rate_limits_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_rate_limits_blocked_until | btree | blocked_until | não | sim | `(blocked_until IS NOT NULL)` | `CREATE INDEX idx_rate_limits_blocked_until ON public.request_rate_limits USING btree (blocked_until) WHERE (blocked_until IS NOT NULL)` |
| idx_rate_limits_identifier_endpoint | btree | identifier, endpoint | sim | sim |  | `CREATE UNIQUE INDEX idx_rate_limits_identifier_endpoint ON public.request_rate_limits USING btree (identifier, endpoint)` |
| idx_rate_limits_window_start | btree | window_start | não | sim |  | `CREATE INDEX idx_rate_limits_window_start ON public.request_rate_limits USING btree (window_start)` |
| request_rate_limits_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX request_rate_limits_pkey ON public.request_rate_limits USING btree (id)` |


## Policies (RLS)

### `Devs can read rate limits`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_dev(( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |

### `Service role can manage rate limits`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | service_role |
| USING | `true` |
| WITH CHECK | `true` |


## Triggers

_nenhum_


## Grants

_nenhum_
