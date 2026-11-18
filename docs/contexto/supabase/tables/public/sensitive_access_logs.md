# public.sensitive_access_logs

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
| 3 | `table_name` | `text` | não |  |  |  |
| 4 | `record_id` | `uuid` | sim |  |  |  |
| 5 | `columns_accessed` | `text[]` | sim |  |  |  |
| 6 | `access_time` | `timestamp with time zone` | sim | `now()` |  |  |
| 7 | `client_ip` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sensitive_access_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sensitive_access_logs_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_fk_sensitive_access_logs_user_id_fkey | btree | user_id | não | sim |  | `CREATE INDEX idx_fk_sensitive_access_logs_user_id_fkey ON public.sensitive_access_logs USING btree (user_id)` |
| sensitive_access_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sensitive_access_logs_pkey ON public.sensitive_access_logs USING btree (id)` |


## Policies (RLS)

### `Only security admins can view access logs`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
