# public.telemetry_logs

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
| 2 | `event_name` | `text` | não |  |  |  |
| 3 | `user_id` | `uuid` | sim |  |  |  |
| 4 | `page_path` | `text` | sim |  |  |  |
| 5 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 6 | `client_info` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 7 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| telemetry_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| telemetry_logs_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_telemetry_logs_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_telemetry_logs_created_at ON public.telemetry_logs USING btree (created_at DESC)` |
| idx_telemetry_logs_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_telemetry_logs_user_id ON public.telemetry_logs USING btree (user_id)` |
| telemetry_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX telemetry_logs_pkey ON public.telemetry_logs USING btree (id)` |


## Policies (RLS)

### `sicoob_merged_33a14fbb170c440f_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `((true AND true) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (( SELECT auth.uid() AS uid) = user_id)))` |

### `sicoob_merged_8dd5bb148a0ca890_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'dev'::app_role))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (( SELECT auth.uid() AS uid) = user_id)))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
