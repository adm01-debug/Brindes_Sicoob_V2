# public.sicoob_rls_audit_logs

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
| 2 | `executed_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 3 | `table_name` | `text` | não |  |  |  |
| 4 | `status` | `text` | não |  |  |  |
| 5 | `issue_details` | `text` | sim |  |  |  |
| 6 | `resolved` | `boolean` | sim | `false` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sicoob_rls_audit_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| sicoob_rls_audit_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sicoob_rls_audit_logs_pkey ON public.sicoob_rls_audit_logs USING btree (id)` |


## Policies (RLS)

### `Devs consultam auditoria RLS`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `( SELECT can_view_audit_logs(( SELECT auth.uid() AS uid)) AS can_view_audit_logs)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
