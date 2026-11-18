# public.file_scan_logs

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
| 3 | `bucket` | `character varying(255)` | não |  |  |  |
| 4 | `path` | `text` | não |  |  |  |
| 5 | `hash` | `character varying(64)` | não |  |  |  |
| 6 | `scan_result` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 7 | `status_code` | `integer` | não |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| file_scan_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| file_scan_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX file_scan_logs_pkey ON public.file_scan_logs USING btree (id)` |
| idx_file_scan_logs_hash | btree | hash | não | sim |  | `CREATE INDEX idx_file_scan_logs_hash ON public.file_scan_logs USING btree (hash)` |
| idx_file_scan_logs_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_file_scan_logs_user_id ON public.file_scan_logs USING btree (user_id)` |


## Policies (RLS)

### `file_scan_logs_select_admin`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'dev'::app_role))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
