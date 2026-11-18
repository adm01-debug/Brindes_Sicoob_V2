# public.password_reset_requests

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
| 2 | `email` | `text` | não |  |  |  |
| 3 | `user_id` | `uuid` | sim |  |  |  |
| 4 | `status` | `text` | não | `'pending'::text` |  |  |
| 5 | `requested_at` | `timestamp with time zone` | não | `now()` |  |  |
| 6 | `reviewed_at` | `timestamp with time zone` | sim |  |  |  |
| 7 | `reviewed_by` | `uuid` | sim |  |  |  |
| 8 | `reviewer_notes` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| password_reset_requests_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| password_reset_requests_reviewed_by_fkey | FOREIGN KEY | `FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| password_reset_requests_status_check | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))` |  |  | sim |
| password_reset_requests_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_password_reset_requests_email_status | btree | email, status | não | sim |  | `CREATE INDEX idx_password_reset_requests_email_status ON public.password_reset_requests USING btree (email, status)` |
| idx_password_reset_requests_requested_at | btree | requested_at | não | sim |  | `CREATE INDEX idx_password_reset_requests_requested_at ON public.password_reset_requests USING btree (requested_at DESC)` |
| idx_password_reset_requests_reviewed_by | btree | reviewed_by | não | sim |  | `CREATE INDEX idx_password_reset_requests_reviewed_by ON public.password_reset_requests USING btree (reviewed_by)` |
| idx_password_reset_requests_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_password_reset_requests_user_id ON public.password_reset_requests USING btree (user_id)` |
| password_reset_requests_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX password_reset_requests_pkey ON public.password_reset_requests USING btree (id)` |


## Policies (RLS)

### `sicoob_merged_006b14a4c98c920c_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'dev'::app_role)))` |
| WITH CHECK |  |

### `sicoob_merged_2aafe781b0a49484_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'dev'::app_role)))` |
| WITH CHECK |  |

### `sicoob_merged_4365bc3f2c7af168_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'dev'::app_role)))` |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'dev'::app_role)))` |

### `sicoob_merged_970ee2fa70918a82_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'dev'::app_role))) OR ((pg_has_role(CURRENT_USER, 'anon'::name, 'member'::text) OR pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text)) AND ((status = 'pending'::text) AND (reviewed_at IS NULL) AND (reviewed_by IS NULL) AND (user_id IS NULL))))` |


## Triggers

_nenhum_


## Grants

_nenhum_
