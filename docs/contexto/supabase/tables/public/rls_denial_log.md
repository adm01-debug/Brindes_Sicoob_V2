# public.rls_denial_log

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `user_email` | `text` | sim |  |  |  |
| 4 | `user_role` | `text` | sim |  |  |  |
| 5 | `table_name` | `text` | não |  |  |  |
| 6 | `operation` | `text` | não |  |  |  |
| 7 | `endpoint` | `text` | sim |  |  |  |
| 8 | `query_summary` | `text` | sim |  |  |  |
| 9 | `target_id` | `uuid` | sim |  |  |  |
| 10 | `target_seller_id` | `uuid` | sim |  |  |  |
| 11 | `policy_hint` | `text` | sim |  |  |  |
| 12 | `error_code` | `text` | sim |  |  |  |
| 13 | `error_message` | `text` | sim |  |  |  |
| 14 | `user_agent` | `text` | sim |  |  |  |
| 15 | `ip_address` | `inet` | sim |  |  |  |
| 16 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| rls_denial_log_operation_check | CHECK | `CHECK (operation = ANY (ARRAY['SELECT'::text, 'INSERT'::text, 'UPDATE'::text, 'DELETE'::text]))` |  |  | sim |
| rls_denial_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_rls_denial_created | btree | created_at | não | sim |  | `CREATE INDEX idx_rls_denial_created ON public.rls_denial_log USING btree (created_at DESC)` |
| idx_rls_denial_table | btree | table_name, created_at | não | sim |  | `CREATE INDEX idx_rls_denial_table ON public.rls_denial_log USING btree (table_name, created_at DESC)` |
| idx_rls_denial_user | btree | user_id, created_at | não | sim |  | `CREATE INDEX idx_rls_denial_user ON public.rls_denial_log USING btree (user_id, created_at DESC)` |
| rls_denial_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX rls_denial_log_pkey ON public.rls_denial_log USING btree (id)` |


## Policies (RLS)

### `Admins can delete old logs`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_strict(( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |

### `Admins read rls denials`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_supervisor_or_above(( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |

### `Block direct insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `false` |

### `Block direct update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `false` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
