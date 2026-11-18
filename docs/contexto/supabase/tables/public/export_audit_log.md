# public.export_audit_log

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
| 2 | `job_id` | `uuid` | sim |  |  |  |
| 3 | `user_id` | `uuid` | sim |  |  |  |
| 4 | `export_type` | `text` | sim |  |  |  |
| 5 | `filters` | `jsonb` | sim |  |  |  |
| 6 | `record_count` | `integer` | sim |  |  |  |
| 7 | `status` | `text` | sim |  |  |  |
| 8 | `file_url` | `text` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| export_audit_log_job_id_fkey | FOREIGN KEY | `FOREIGN KEY (job_id) REFERENCES export_jobs(id)` | NO ACTION | NO ACTION | sim |
| export_audit_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| export_audit_log_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| export_audit_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX export_audit_log_pkey ON public.export_audit_log USING btree (id)` |
| idx_fk_export_audit_log_job_id_fkey | btree | job_id | não | sim |  | `CREATE INDEX idx_fk_export_audit_log_job_id_fkey ON public.export_audit_log USING btree (job_id)` |
| idx_fk_export_audit_log_user_id_fkey | btree | user_id | não | sim |  | `CREATE INDEX idx_fk_export_audit_log_user_id_fkey ON public.export_audit_log USING btree (user_id)` |


## Policies (RLS)

### `sicoob_merged_f811a0c09bae1c64_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((true AND is_admin(( SELECT auth.uid() AS uid))) OR (true AND (( SELECT auth.uid() AS uid) = user_id)))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
