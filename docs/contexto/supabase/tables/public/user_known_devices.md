# public.user_known_devices

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
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `device_fingerprint` | `text` | não |  |  |  |
| 4 | `ip_address` | `text` | não |  |  |  |
| 5 | `user_agent` | `text` | sim |  |  |  |
| 6 | `browser_name` | `text` | sim |  |  |  |
| 7 | `os_name` | `text` | sim |  |  |  |
| 8 | `device_type` | `text` | sim |  |  |  |
| 9 | `location` | `text` | sim |  |  |  |
| 10 | `first_seen_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `last_seen_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `is_trusted` | `boolean` | sim | `false` |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| user_known_devices_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| user_known_devices_user_id_device_fingerprint_key | UNIQUE | `UNIQUE (user_id, device_fingerprint)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.device_login_notifications | device_login_notifications_device_id_fkey | device_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| user_known_devices_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX user_known_devices_pkey ON public.user_known_devices USING btree (id)` |
| user_known_devices_user_id_device_fingerprint_key | btree | user_id, device_fingerprint | sim | sim |  | `CREATE UNIQUE INDEX user_known_devices_user_id_device_fingerprint_key ON public.user_known_devices USING btree (user_id, device_fingerprint)` |


## Policies (RLS)

### `Users view own devices`

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
