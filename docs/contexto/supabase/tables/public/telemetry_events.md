# public.telemetry_events

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
| 2 | `event_type` | `text` | não |  |  |  |
| 3 | `severity` | `text` | não | `'info'::text` |  |  |
| 4 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 5 | `user_id` | `uuid` | sim |  |  |  |
| 6 | `session_id` | `text` | sim |  |  |  |
| 7 | `url` | `text` | sim |  |  |  |
| 8 | `user_agent` | `text` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| telemetry_events_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| telemetry_events_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_fk_telemetry_events_user_id_fkey | btree | user_id | não | sim |  | `CREATE INDEX idx_fk_telemetry_events_user_id_fkey ON public.telemetry_events USING btree (user_id)` |
| telemetry_events_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX telemetry_events_pkey ON public.telemetry_events USING btree (id)` |


## Policies (RLS)

### `sicoob_merged_4bb6533070d1ac18_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_supervisor_or_above(( SELECT auth.uid() AS uid))) OR (true AND (EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['dev'::app_role, 'supervisor'::app_role, 'gestor_compras'::app_role])))))))` |
| WITH CHECK |  |

### `sicoob_merged_db6797a248103735_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND true) OR (true AND true))` |


## Triggers

_nenhum_


## Grants

_nenhum_
