# public.manager_notification_config

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
| 3 | `slack_webhook_url` | `text` | sim |  |  |  |
| 4 | `email_enabled` | `boolean` | sim | `true` |  |  |
| 5 | `slack_enabled` | `boolean` | sim | `false` |  |  |
| 6 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| manager_notification_config_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| manager_notification_config_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_fk_manager_notification_config_user_id_fkey | btree | user_id | não | sim |  | `CREATE INDEX idx_fk_manager_notification_config_user_id_fkey ON public.manager_notification_config USING btree (user_id)` |
| manager_notification_config_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX manager_notification_config_pkey ON public.manager_notification_config USING btree (id)` |


## Policies (RLS)

### `Managers can manage their own configs`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
