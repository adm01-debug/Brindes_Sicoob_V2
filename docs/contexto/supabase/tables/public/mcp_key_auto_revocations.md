# public.mcp_key_auto_revocations

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
| 2 | `key_id` | `uuid` | não |  |  |  |
| 3 | `created_by` | `uuid` | não |  |  |  |
| 4 | `revoked_at` | `timestamp with time zone` | não | `now()` |  |  |
| 5 | `source` | `text` | não |  |  |  |
| 6 | `reason` | `text` | não | `'creator_lost_dev_role'::text` |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| mcp_key_auto_revocations_key_id_fkey | FOREIGN KEY | `FOREIGN KEY (key_id) REFERENCES mcp_api_keys(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| mcp_key_auto_revocations_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| mcp_key_auto_revocations_source_check | CHECK | `CHECK (source = ANY (ARRAY['trigger'::text, 'cron'::text, 'manual'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_mcp_auto_rev_key | btree | key_id | não | sim |  | `CREATE INDEX idx_mcp_auto_rev_key ON public.mcp_key_auto_revocations USING btree (key_id)` |
| idx_mcp_auto_rev_user | btree | created_by, revoked_at | não | sim |  | `CREATE INDEX idx_mcp_auto_rev_user ON public.mcp_key_auto_revocations USING btree (created_by, revoked_at DESC)` |
| mcp_key_auto_revocations_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX mcp_key_auto_revocations_pkey ON public.mcp_key_auto_revocations USING btree (id)` |


## Policies (RLS)

### `Devs can view auto-revocations`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `is_dev(( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
