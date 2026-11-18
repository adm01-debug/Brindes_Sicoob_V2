# public.sicoob_manager_audit

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
| 2 | `manager_id` | `uuid` | não |  |  |  |
| 3 | `order_id` | `uuid` | não |  |  |  |
| 4 | `action` | `text` | não |  |  |  |
| 5 | `details` | `jsonb` | sim |  |  |  |
| 6 | `ip_address` | `text` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sicoob_manager_audit_manager_id_fkey | FOREIGN KEY | `FOREIGN KEY (manager_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| sicoob_manager_audit_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_fk_sicoob_manager_audit_manager_id_fkey | btree | manager_id | não | sim |  | `CREATE INDEX idx_fk_sicoob_manager_audit_manager_id_fkey ON public.sicoob_manager_audit USING btree (manager_id)` |
| sicoob_manager_audit_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sicoob_manager_audit_pkey ON public.sicoob_manager_audit USING btree (id)` |


## Policies (RLS)

### `sicoob_merged_20796522042214b6_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((true AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (true AND (( SELECT auth.uid() AS uid) = manager_id)))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
