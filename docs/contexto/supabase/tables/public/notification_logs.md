# public.notification_logs

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
| 2 | `user_id` | `uuid` | sim |  |  |  |
| 3 | `channel` | `text` | não |  |  |  |
| 4 | `provider_response` | `jsonb` | sim |  |  |  |
| 5 | `status` | `text` | não |  |  |  |
| 6 | `error_code` | `text` | sim |  |  |  |
| 7 | `execution_time_ms` | `integer` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| notification_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| notification_logs_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_notification_logs_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_notification_logs_user_id ON public.notification_logs USING btree (user_id)` |
| notification_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX notification_logs_pkey ON public.notification_logs USING btree (id)` |


## Policies (RLS)

### `Users can view their own logs`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
