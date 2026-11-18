# public.voice_command_logs

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
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `transcript` | `text` | não |  |  |  |
| 4 | `action` | `text` | não |  |  |  |
| 5 | `response` | `text` | sim |  |  |  |
| 6 | `data` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 7 | `duration_ms` | `integer` | sim |  |  |  |
| 8 | `success` | `boolean` | sim | `true` |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| voice_command_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_voice_command_logs_user_created | btree | user_id, created_at | não | sim |  | `CREATE INDEX idx_voice_command_logs_user_created ON public.voice_command_logs USING btree (user_id, created_at DESC)` |
| voice_command_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX voice_command_logs_pkey ON public.voice_command_logs USING btree (id)` |


## Policies (RLS)

### `sicoob_merged_c5b40c309682e87e_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (( SELECT auth.uid() AS uid) = user_id))` |

### `sicoob_merged_f1756af96229c004_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_manager_or_admin()) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (( SELECT auth.uid() AS uid) = user_id)))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
