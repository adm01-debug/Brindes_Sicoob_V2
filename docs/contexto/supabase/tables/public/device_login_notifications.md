# public.device_login_notifications

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | sim |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `device_id` | `uuid` | sim |  |  |  |
| 4 | `ip_address` | `text` | não |  |  |  |
| 5 | `user_agent` | `text` | sim |  |  |  |
| 6 | `location` | `text` | sim |  |  |  |
| 7 | `notification_sent_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `email_sent` | `boolean` | sim | `false` |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| device_login_notifications_device_id_fkey | FOREIGN KEY | `FOREIGN KEY (device_id) REFERENCES user_known_devices(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| device_login_notifications_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| device_login_notifications_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX device_login_notifications_pkey ON public.device_login_notifications USING btree (id)` |
| idx_fk_device_login_notifications_device_id_fkey | btree | device_id | não | sim |  | `CREATE INDEX idx_fk_device_login_notifications_device_id_fkey ON public.device_login_notifications USING btree (device_id)` |


## Policies (RLS)

### `user_read_own_device_login_notifications`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(user_id = ( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
