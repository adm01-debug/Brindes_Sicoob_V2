# public.ai_usage_logs

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


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `function_name` | `text` | não |  |  |  |
| 4 | `model` | `text` | sim |  |  |  |
| 5 | `input_tokens` | `integer` | sim | `0` |  |  |
| 6 | `output_tokens` | `integer` | sim | `0` |  |  |
| 7 | `total_tokens` | `integer` | sim | `0` |  |  |
| 8 | `estimated_cost_usd` | `numeric(10,6)` | sim | `0` |  |  |
| 9 | `duration_ms` | `integer` | sim |  |  |  |
| 10 | `status` | `text` | não | `'success'::text` |  |  |
| 11 | `error_message` | `text` | sim |  |  |  |
| 12 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ai_usage_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| ai_usage_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ai_usage_logs_pkey ON public.ai_usage_logs USING btree (id)` |
| idx_ai_usage_logs_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_ai_usage_logs_created_at ON public.ai_usage_logs USING btree (created_at)` |
| idx_ai_usage_logs_function | btree | function_name | não | sim |  | `CREATE INDEX idx_ai_usage_logs_function ON public.ai_usage_logs USING btree (function_name)` |
| idx_ai_usage_logs_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_ai_usage_logs_user_id ON public.ai_usage_logs USING btree (user_id)` |
| idx_ai_usage_logs_user_month | btree | user_id, created_at | não | sim |  | `CREATE INDEX idx_ai_usage_logs_user_month ON public.ai_usage_logs USING btree (user_id, created_at)` |


## Policies (RLS)

### `sicoob_merged_41f5929da133cf4f_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'service_role'::name, 'member'::text) AND true)` |

### `sicoob_merged_6e546e88158f84a6_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(pg_has_role(CURRENT_USER, 'service_role'::name, 'member'::text) AND true)` |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'service_role'::name, 'member'::text) AND true)` |

### `sicoob_merged_b3b661bd3362fb3f_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (user_id = ( SELECT auth.uid() AS uid))))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
