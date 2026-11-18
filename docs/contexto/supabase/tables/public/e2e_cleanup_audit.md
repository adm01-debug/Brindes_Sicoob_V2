# public.e2e_cleanup_audit

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
| 2 | `email` | `text` | não |  |  |  |
| 3 | `user_id` | `uuid` | sim |  |  |  |
| 4 | `dry_run` | `boolean` | não | `true` |  |  |
| 5 | `status` | `text` | não |  |  |  |
| 6 | `reason` | `text` | sim |  |  |  |
| 7 | `ip` | `text` | sim |  |  |  |
| 8 | `user_agent` | `text` | sim |  |  |  |
| 9 | `total_deleted` | `integer` | não | `0` |  |  |
| 10 | `deleted_by_table` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 11 | `errors` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 12 | `duration_ms` | `integer` | não | `0` |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `seller_scope` | `text` | sim |  |  |  |
| 15 | `seller_id` | `uuid` | sim |  |  |  |
| 16 | `name_filter_prefix` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| e2e_cleanup_audit_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| e2e_cleanup_audit_status_check | CHECK | `CHECK (status = ANY (ARRAY['ok'::text, 'error'::text, 'rate_limited'::text, 'unauthorized'::text, 'forbidden'::text, 'not_found'::text, 'invalid'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| e2e_cleanup_audit_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX e2e_cleanup_audit_pkey ON public.e2e_cleanup_audit USING btree (id)` |
| idx_e2e_cleanup_audit_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_e2e_cleanup_audit_created_at ON public.e2e_cleanup_audit USING btree (created_at DESC)` |
| idx_e2e_cleanup_audit_email | btree | email, created_at | não | sim |  | `CREATE INDEX idx_e2e_cleanup_audit_email ON public.e2e_cleanup_audit USING btree (email, created_at DESC)` |
| idx_e2e_cleanup_audit_seller_id | btree | seller_id, created_at | não | sim | `(seller_id IS NOT NULL)` | `CREATE INDEX idx_e2e_cleanup_audit_seller_id ON public.e2e_cleanup_audit USING btree (seller_id, created_at DESC) WHERE (seller_id IS NOT NULL)` |
| idx_e2e_cleanup_audit_status | btree | status, created_at | não | sim |  | `CREATE INDEX idx_e2e_cleanup_audit_status ON public.e2e_cleanup_audit USING btree (status, created_at DESC)` |


## Policies (RLS)

### `admins_select_e2e_cleanup_audit`

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
