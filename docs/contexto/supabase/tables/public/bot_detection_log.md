# public.bot_detection_log

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
| 2 | `ip_address` | `text` | não |  |  |  |
| 3 | `user_agent` | `text` | sim |  |  |  |
| 4 | `endpoint` | `text` | não |  |  |  |
| 5 | `detection_reason` | `text` | não |  |  |  |
| 6 | `request_count` | `integer` | sim | `1` |  |  |
| 7 | `blocked` | `boolean` | não | `false` |  |  |
| 8 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| bot_detection_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| bot_detection_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX bot_detection_log_pkey ON public.bot_detection_log USING btree (id)` |
| idx_bot_log_blocked | btree | blocked | não | sim | `(blocked = true)` | `CREATE INDEX idx_bot_log_blocked ON public.bot_detection_log USING btree (blocked) WHERE (blocked = true)` |
| idx_bot_log_created | btree | created_at | não | sim |  | `CREATE INDEX idx_bot_log_created ON public.bot_detection_log USING btree (created_at DESC)` |
| idx_bot_log_ip | btree | ip_address | não | sim |  | `CREATE INDEX idx_bot_log_ip ON public.bot_detection_log USING btree (ip_address)` |


## Policies (RLS)

### `Devs can read bot log`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_dev(( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |

### `Service role can insert bot log`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | service_role |
| USING |  |
| WITH CHECK | `true` |


## Triggers

_nenhum_


## Grants

_nenhum_
