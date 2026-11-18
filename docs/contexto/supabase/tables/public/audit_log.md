# public.audit_log

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
| 3 | `action` | `text` | não |  |  |  |
| 4 | `entity_type` | `text` | não |  |  |  |
| 5 | `entity_id` | `text` | não |  |  |  |
| 6 | `old_values` | `jsonb` | sim |  |  |  |
| 7 | `new_values` | `jsonb` | sim |  |  |  |
| 8 | `ip_address` | `text` | sim |  |  |  |
| 9 | `user_agent` | `text` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| audit_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| audit_log_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| audit_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX audit_log_pkey ON public.audit_log USING btree (id)` |
| idx_audit_log_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_audit_log_created_at ON public.audit_log USING btree (created_at DESC)` |
| idx_audit_log_entity | btree | entity_type, entity_id | não | sim |  | `CREATE INDEX idx_audit_log_entity ON public.audit_log USING btree (entity_type, entity_id)` |
| idx_audit_log_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_audit_log_user_id ON public.audit_log USING btree (user_id)` |


## Policies (RLS)

### `admin_le_audit_log`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'dev'::app_role))` |
| WITH CHECK |  |

### `authenticated_registra_propria_acao`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((user_id = ( SELECT auth.uid() AS uid)) OR (user_id IS NULL))` |


## Triggers

_nenhum_


## Grants

_nenhum_
