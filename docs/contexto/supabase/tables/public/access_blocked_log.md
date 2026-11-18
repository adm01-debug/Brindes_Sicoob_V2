# public.access_blocked_log

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
| 2 | `user_id` | `uuid` | sim |  |  |  |
| 3 | `email` | `text` | sim |  |  |  |
| 4 | `ip_address` | `text` | não |  |  |  |
| 5 | `city` | `text` | sim |  |  |  |
| 6 | `state` | `text` | sim |  |  |  |
| 7 | `country` | `text` | sim |  |  |  |
| 8 | `block_reason` | `text` | não |  |  |  |
| 9 | `user_agent` | `text` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| access_blocked_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| access_blocked_log_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| access_blocked_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX access_blocked_log_pkey ON public.access_blocked_log USING btree (id)` |
| idx_access_blocked_log_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_access_blocked_log_created_at ON public.access_blocked_log USING btree (created_at DESC)` |
| idx_access_blocked_log_ip | btree | ip_address | não | sim |  | `CREATE INDEX idx_access_blocked_log_ip ON public.access_blocked_log USING btree (ip_address)` |
| idx_access_blocked_log_user | btree | user_id | não | sim |  | `CREATE INDEX idx_access_blocked_log_user ON public.access_blocked_log USING btree (user_id)` |


## Policies (RLS)

### `Admins read blocked access logs`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `can_manage(( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |

### `Service role inserts blocked access logs`

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
