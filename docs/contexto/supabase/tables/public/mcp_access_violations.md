# public.mcp_access_violations

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
| 2 | `user_id` | `uuid` | sim |  |  |  |
| 3 | `reason` | `text` | não |  |  |  |
| 4 | `source` | `text` | não |  |  |  |
| 5 | `operation` | `text` | sim |  |  |  |
| 6 | `target_key_id` | `uuid` | sim |  |  |  |
| 7 | `ip_address` | `text` | sim |  |  |  |
| 8 | `user_agent` | `text` | sim |  |  |  |
| 9 | `request_id` | `text` | sim |  |  |  |
| 10 | `details` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| mcp_access_violations_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_mcp_violations_created | btree | created_at | não | sim |  | `CREATE INDEX idx_mcp_violations_created ON public.mcp_access_violations USING btree (created_at DESC)` |
| idx_mcp_violations_ip_created | btree | ip_address, created_at | não | sim |  | `CREATE INDEX idx_mcp_violations_ip_created ON public.mcp_access_violations USING btree (ip_address, created_at DESC)` |
| idx_mcp_violations_user_created | btree | user_id, created_at | não | sim |  | `CREATE INDEX idx_mcp_violations_user_created ON public.mcp_access_violations USING btree (user_id, created_at DESC)` |
| mcp_access_violations_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX mcp_access_violations_pkey ON public.mcp_access_violations USING btree (id)` |


## Policies (RLS)

### `Admins read mcp violations`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin(( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
