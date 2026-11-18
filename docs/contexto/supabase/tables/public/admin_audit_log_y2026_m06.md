# public.admin_audit_log_y2026_m06

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
| partição de | public.admin_audit_log |
| bound | `FOR VALUES FROM ('2026-06-01 00:00:00+00') TO ('2026-07-01 00:00:00+00')` |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `action` | `text` | não |  |  |  |
| 4 | `resource_type` | `text` | não |  |  |  |
| 5 | `resource_id` | `text` | sim |  |  |  |
| 6 | `details` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 7 | `ip_address` | `text` | sim |  |  |  |
| 8 | `user_agent` | `text` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `request_id` | `text` | sim |  |  |  |
| 11 | `started_at` | `timestamp with time zone` | sim |  |  |  |
| 12 | `finished_at` | `timestamp with time zone` | sim |  |  |  |
| 13 | `duration_ms` | `integer` | sim |  |  |  |
| 14 | `status` | `text` | sim |  |  |  |
| 15 | `payload_summary` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 16 | `source` | `text` | sim |  |  |  |
| 17 | `previous_hash` | `text` | sim |  |  |  |
| 18 | `current_hash` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| admin_audit_log_y2026_m06_pkey | PRIMARY KEY | `PRIMARY KEY (id, created_at)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| admin_audit_log_y2026_m06_action_idx | btree | action | não | sim |  | `CREATE INDEX admin_audit_log_y2026_m06_action_idx ON public.admin_audit_log_y2026_m06 USING btree (action)` |
| admin_audit_log_y2026_m06_created_at_idx | btree | created_at | não | sim |  | `CREATE INDEX admin_audit_log_y2026_m06_created_at_idx ON public.admin_audit_log_y2026_m06 USING btree (created_at DESC)` |
| admin_audit_log_y2026_m06_current_hash_idx | btree | current_hash | não | sim |  | `CREATE INDEX admin_audit_log_y2026_m06_current_hash_idx ON public.admin_audit_log_y2026_m06 USING btree (current_hash)` |
| admin_audit_log_y2026_m06_pkey | btree | id, created_at | sim | sim |  | `CREATE UNIQUE INDEX admin_audit_log_y2026_m06_pkey ON public.admin_audit_log_y2026_m06 USING btree (id, created_at)` |
| admin_audit_log_y2026_m06_request_id_idx | btree | request_id | não | sim | `(request_id IS NOT NULL)` | `CREATE INDEX admin_audit_log_y2026_m06_request_id_idx ON public.admin_audit_log_y2026_m06 USING btree (request_id) WHERE (request_id IS NOT NULL)` |
| admin_audit_log_y2026_m06_resource_type_resource_id_created_idx | btree | resource_type, resource_id, created_at | não | sim |  | `CREATE INDEX admin_audit_log_y2026_m06_resource_type_resource_id_created_idx ON public.admin_audit_log_y2026_m06 USING btree (resource_type, resource_id, created_at DESC)` |
| admin_audit_log_y2026_m06_source_created_at_idx | btree | source, created_at | não | sim | `(status IS NOT NULL)` | `CREATE INDEX admin_audit_log_y2026_m06_source_created_at_idx ON public.admin_audit_log_y2026_m06 USING btree (source, created_at DESC) WHERE (status IS NOT NULL)` |
| admin_audit_log_y2026_m06_status_created_at_idx | btree | status, created_at | não | sim | `(status IS NOT NULL)` | `CREATE INDEX admin_audit_log_y2026_m06_status_created_at_idx ON public.admin_audit_log_y2026_m06 USING btree (status, created_at DESC) WHERE (status IS NOT NULL)` |
| admin_audit_log_y2026_m06_user_id_idx | btree | user_id | não | sim |  | `CREATE INDEX admin_audit_log_y2026_m06_user_id_idx ON public.admin_audit_log_y2026_m06 USING btree (user_id)` |


## Policies (RLS)

### `Admins can insert audit logs`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)` |

### `Admins can view audit logs`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
