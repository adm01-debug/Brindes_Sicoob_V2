# public.admin_audit_log

| propriedade | valor |
|---|---|
| tipo | partitioned |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| chave de partição | `RANGE (created_at)` |


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
| admin_audit_log_partitioned_pkey | PRIMARY KEY | `PRIMARY KEY (id, created_at)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| admin_audit_log_partitioned_pkey | btree | id, created_at | sim | sim |  | `CREATE UNIQUE INDEX admin_audit_log_partitioned_pkey ON ONLY public.admin_audit_log USING btree (id, created_at)` |
| idx_admin_audit_log_action | btree | action | não | sim |  | `CREATE INDEX idx_admin_audit_log_action ON ONLY public.admin_audit_log USING btree (action)` |
| idx_admin_audit_log_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_admin_audit_log_created_at ON ONLY public.admin_audit_log USING btree (created_at DESC)` |
| idx_admin_audit_log_current_hash | btree | current_hash | não | sim |  | `CREATE INDEX idx_admin_audit_log_current_hash ON ONLY public.admin_audit_log USING btree (current_hash)` |
| idx_admin_audit_log_request_id | btree | request_id | não | sim | `(request_id IS NOT NULL)` | `CREATE INDEX idx_admin_audit_log_request_id ON ONLY public.admin_audit_log USING btree (request_id) WHERE (request_id IS NOT NULL)` |
| idx_admin_audit_log_resource_lookup | btree | resource_type, resource_id, created_at | não | sim |  | `CREATE INDEX idx_admin_audit_log_resource_lookup ON ONLY public.admin_audit_log USING btree (resource_type, resource_id, created_at DESC)` |
| idx_admin_audit_log_source | btree | source, created_at | não | sim | `(status IS NOT NULL)` | `CREATE INDEX idx_admin_audit_log_source ON ONLY public.admin_audit_log USING btree (source, created_at DESC) WHERE (status IS NOT NULL)` |
| idx_admin_audit_log_status | btree | status, created_at | não | sim | `(status IS NOT NULL)` | `CREATE INDEX idx_admin_audit_log_status ON ONLY public.admin_audit_log USING btree (status, created_at DESC) WHERE (status IS NOT NULL)` |
| idx_admin_audit_log_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_admin_audit_log_user_id ON ONLY public.admin_audit_log USING btree (user_id)` |


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
