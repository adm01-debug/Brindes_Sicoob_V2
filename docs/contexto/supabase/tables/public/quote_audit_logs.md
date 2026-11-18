# public.quote_audit_logs

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
| 2 | `quote_id` | `uuid` | sim |  |  |  |
| 3 | `user_id` | `uuid` | sim |  |  |  |
| 4 | `action` | `text` | não |  |  |  |
| 5 | `ip_address` | `text` | sim |  |  |  |
| 6 | `user_agent` | `text` | sim |  |  |  |
| 7 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| quote_audit_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| quote_audit_logs_quote_id_fkey | FOREIGN KEY | `FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| quote_audit_logs_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_fk_quote_audit_logs_quote_id_fkey | btree | quote_id | não | sim |  | `CREATE INDEX idx_fk_quote_audit_logs_quote_id_fkey ON public.quote_audit_logs USING btree (quote_id)` |
| idx_fk_quote_audit_logs_user_id_fkey | btree | user_id | não | sim |  | `CREATE INDEX idx_fk_quote_audit_logs_user_id_fkey ON public.quote_audit_logs USING btree (user_id)` |
| quote_audit_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX quote_audit_logs_pkey ON public.quote_audit_logs USING btree (id)` |


## Policies (RLS)

### `sicoob_merged_0de829c7bd357a79_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (EXISTS ( SELECT 1    FROM quotes   WHERE ((quotes.id = quote_audit_logs.quote_id) AND (quotes.seller_id = ( SELECT auth.uid() AS uid)))))))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
