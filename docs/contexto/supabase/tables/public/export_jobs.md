# public.export_jobs

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
| 3 | `export_type` | `text` | não |  |  |  |
| 4 | `entity_type` | `text` | não |  |  |  |
| 5 | `filters` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 6 | `status` | `text` | não | `'pending'::text` |  |  |
| 7 | `attempts` | `integer` | sim | `0` |  |  |
| 8 | `max_attempts` | `integer` | sim | `3` |  |  |
| 9 | `error_message` | `text` | sim |  |  |  |
| 10 | `file_url` | `text` | sim |  |  |  |
| 11 | `total_count` | `integer` | sim | `0` |  |  |
| 12 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 13 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 14 | `file_path` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| export_jobs_entity_type_check | CHECK | `CHECK (entity_type = ANY (ARRAY['orders'::text, 'quotes'::text]))` |  |  | sim |
| export_jobs_export_type_check | CHECK | `CHECK (export_type = ANY (ARRAY['pdf'::text, 'excel'::text, 'csv'::text]))` |  |  | sim |
| export_jobs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| export_jobs_status_check | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text]))` |  |  | sim |
| export_jobs_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.export_audit_log | export_audit_log_job_id_fkey | job_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| export_jobs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX export_jobs_pkey ON public.export_jobs USING btree (id)` |
| idx_export_jobs_pending_claim | btree | created_at, id | não | sim | `(status = ANY (ARRAY['pending'::text, 'failed'::text]))` | `CREATE INDEX idx_export_jobs_pending_claim ON public.export_jobs USING btree (created_at, id) WHERE (status = ANY (ARRAY['pending'::text, 'failed'::text]))` |
| idx_fk_export_jobs_user_id_fkey | btree | user_id | não | sim |  | `CREATE INDEX idx_fk_export_jobs_user_id_fkey ON public.export_jobs USING btree (user_id)` |


## Policies (RLS)

### `Users can create their own export jobs`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(( SELECT auth.uid() AS uid) = user_id)` |

### `Users can view their own export jobs`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
