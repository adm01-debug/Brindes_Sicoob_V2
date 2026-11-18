# public.scheduled_notifications

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
| 4 | `template_id` | `text` | sim |  |  |  |
| 5 | `payload` | `jsonb` | não |  |  |  |
| 6 | `scheduled_for` | `timestamp with time zone` | não |  |  |  |
| 7 | `status` | `text` | sim | `'scheduled'::text` |  |  |
| 8 | `retry_count` | `integer` | sim | `0` |  |  |
| 9 | `last_attempt` | `timestamp with time zone` | sim |  |  |  |
| 10 | `error_message` | `text` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| scheduled_notifications_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| scheduled_notifications_status_check | CHECK | `CHECK (status = ANY (ARRAY['scheduled'::text, 'sent'::text, 'failed'::text, 'cancelled'::text]))` |  |  | sim |
| scheduled_notifications_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_fk_scheduled_notifications_user_id_fkey | btree | user_id | não | sim |  | `CREATE INDEX idx_fk_scheduled_notifications_user_id_fkey ON public.scheduled_notifications USING btree (user_id)` |
| idx_scheduled_notif_status_time | btree | status, scheduled_for | não | sim |  | `CREATE INDEX idx_scheduled_notif_status_time ON public.scheduled_notifications USING btree (status, scheduled_for)` |
| scheduled_notifications_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX scheduled_notifications_pkey ON public.scheduled_notifications USING btree (id)` |


## Policies (RLS)

### `Users can view their own scheduled`

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
