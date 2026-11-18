# public.admin_config_audit

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
| 2 | `action_type` | `text` | não |  |  |  |
| 3 | `table_name` | `text` | não |  |  |  |
| 4 | `old_data` | `jsonb` | sim |  |  |  |
| 5 | `new_data` | `jsonb` | sim |  |  |  |
| 6 | `changed_by` | `uuid` | sim |  |  |  |
| 7 | `changed_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| admin_config_audit_changed_by_fkey | FOREIGN KEY | `FOREIGN KEY (changed_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| admin_config_audit_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| admin_config_audit_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX admin_config_audit_pkey ON public.admin_config_audit USING btree (id)` |
| idx_fk_admin_config_audit_changed_by_fkey | btree | changed_by | não | sim |  | `CREATE INDEX idx_fk_admin_config_audit_changed_by_fkey ON public.admin_config_audit USING btree (changed_by)` |


## Policies (RLS)

### `sicoob_merged_a388eff262f75596_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'manager'::text])))))))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
