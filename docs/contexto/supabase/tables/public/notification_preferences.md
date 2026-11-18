# public.notification_preferences

> Preferências privadas de entrega e agrupamento de notificações de cada usuário.

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
| 1 | `user_id` | `uuid` | não |  |  |  |
| 2 | `email_enabled` | `boolean` | sim | `true` |  |  |
| 3 | `push_enabled` | `boolean` | sim | `false` |  |  |
| 4 | `whatsapp_enabled` | `boolean` | sim | `false` |  |  |
| 5 | `events_config` | `jsonb` | sim | `'{"new_order": true, "pilot_update": true, "order_status_change": true}'::jsonb` |  |  |
| 6 | `dnd_enabled` | `boolean` | sim | `false` |  |  |
| 7 | `dnd_start` | `time without time zone` | sim | `'22:00:00'::time without time zone` |  |  |
| 8 | `dnd_end` | `time without time zone` | sim | `'08:00:00'::time without time zone` |  |  |
| 9 | `digest_enabled` | `boolean` | sim | `false` |  |  |
| 10 | `digest_frequency` | `text` | sim | `'daily'::text` |  |  |
| 11 | `channel_priorities` | `jsonb` | sim | `'{"push": 2, "email": 1, "whatsapp": 3}'::jsonb` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| notification_preferences_digest_frequency_check | CHECK | `CHECK (digest_frequency = ANY (ARRAY['daily'::text, 'weekly'::text]))` |  |  | sim |
| notification_preferences_pkey | PRIMARY KEY | `PRIMARY KEY (user_id)` |  |  | sim |
| notification_preferences_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| notification_preferences_pkey | btree | user_id | sim | sim |  | `CREATE UNIQUE INDEX notification_preferences_pkey ON public.notification_preferences USING btree (user_id)` |


## Policies (RLS)

### `notification_preferences_own_rows`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(user_id = ( SELECT auth.uid() AS uid))` |
| WITH CHECK | `(user_id = ( SELECT auth.uid() AS uid))` |


## Triggers

_nenhum_


## Grants

_nenhum_
