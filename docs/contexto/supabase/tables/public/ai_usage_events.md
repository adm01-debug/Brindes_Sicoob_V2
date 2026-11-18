# public.ai_usage_events

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
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `function_name` | `text` | não |  |  |  |
| 4 | `event_type` | `text` | não |  |  |  |
| 5 | `metadata` | `jsonb` | sim |  |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ai_usage_events_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| ai_usage_events_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ai_usage_events_pkey ON public.ai_usage_events USING btree (id)` |
| idx_ai_usage_events_fn_created | btree | function_name, created_at | não | sim |  | `CREATE INDEX idx_ai_usage_events_fn_created ON public.ai_usage_events USING btree (function_name, created_at DESC)` |
| idx_ai_usage_events_user_created | btree | user_id, created_at | não | sim |  | `CREATE INDEX idx_ai_usage_events_user_created ON public.ai_usage_events USING btree (user_id, created_at DESC)` |


## Policies (RLS)

### `Users can insert their own usage events`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(( SELECT auth.uid() AS uid) = user_id)` |

### `Users can view their own usage events`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((( SELECT auth.uid() AS uid) = user_id) OR is_admin(( SELECT auth.uid() AS uid)))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
