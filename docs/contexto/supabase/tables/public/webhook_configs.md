# public.webhook_configs

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
| 3 | `system` | `text` | não |  |  |  |
| 4 | `name` | `text` | não |  |  |  |
| 5 | `url` | `text` | não |  |  |  |
| 6 | `secret` | `text` | sim |  |  |  |
| 7 | `events` | `text[]` | não |  |  |  |
| 8 | `is_active` | `boolean` | sim | `true` |  |  |
| 9 | `max_retries` | `integer` | sim | `3` |  |  |
| 10 | `retry_delay_seconds` | `integer` | sim | `60` |  |  |
| 11 | `last_triggered_at` | `timestamp with time zone` | sim |  |  |  |
| 12 | `total_calls` | `integer` | sim | `0` |  |  |
| 13 | `failed_calls` | `integer` | sim | `0` |  |  |
| 14 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| webhook_configs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| webhook_configs_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.webhook_logs | webhook_logs_webhook_id_fkey | webhook_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_fk_webhook_configs_user_id_fkey | btree | user_id | não | sim |  | `CREATE INDEX idx_fk_webhook_configs_user_id_fkey ON public.webhook_configs USING btree (user_id)` |
| webhook_configs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX webhook_configs_pkey ON public.webhook_configs USING btree (id)` |


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
