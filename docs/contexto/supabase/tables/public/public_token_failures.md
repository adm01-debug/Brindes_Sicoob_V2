# public.public_token_failures

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
| 2 | `resource_type` | `text` | não |  |  |  |
| 3 | `resource_id` | `text` | sim |  |  |  |
| 4 | `attempted_token` | `text` | sim |  |  |  |
| 5 | `ip_address` | `text` | sim |  |  |  |
| 6 | `user_agent` | `text` | sim |  |  |  |
| 7 | `reason` | `text` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| public_token_failures_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| public_token_failures_resource_type_check | CHECK | `CHECK (resource_type = ANY (ARRAY['quote'::text, 'kit'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_public_token_failures_ip | btree | ip_address, created_at | não | sim |  | `CREATE INDEX idx_public_token_failures_ip ON public.public_token_failures USING btree (ip_address, created_at DESC)` |
| idx_public_token_failures_resource | btree | resource_type, resource_id, created_at | não | sim |  | `CREATE INDEX idx_public_token_failures_resource ON public.public_token_failures USING btree (resource_type, resource_id, created_at DESC)` |
| public_token_failures_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX public_token_failures_pkey ON public.public_token_failures USING btree (id)` |


## Policies (RLS)

### `Admins read token failures`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin(( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |

### `Service role inserts token failures`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | service_role |
| USING |  |
| WITH CHECK | `true` |


## Triggers

_nenhum_


## Grants

_nenhum_
