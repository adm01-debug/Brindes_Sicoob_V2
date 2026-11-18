# public.bitrix_sync_logs

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
| 2 | `synced_by` | `uuid` | sim |  |  |  |
| 3 | `clients_synced` | `integer` | não | `0` |  |  |
| 4 | `deals_synced` | `integer` | não | `0` |  |  |
| 5 | `status` | `text` | não | `'pending'::text` |  |  |
| 6 | `error_message` | `text` | sim |  |  |  |
| 7 | `started_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `completed_at` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| bitrix_sync_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| bitrix_sync_logs_synced_by_fkey | FOREIGN KEY | `FOREIGN KEY (synced_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| bitrix_sync_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX bitrix_sync_logs_pkey ON public.bitrix_sync_logs USING btree (id)` |
| bitrix_sync_logs_started_idx | btree | started_at | não | sim |  | `CREATE INDEX bitrix_sync_logs_started_idx ON public.bitrix_sync_logs USING btree (started_at DESC)` |
| idx_bitrix_sync_logs_synced_by | btree | synced_by | não | sim |  | `CREATE INDEX idx_bitrix_sync_logs_synced_by ON public.bitrix_sync_logs USING btree (synced_by)` |


## Policies (RLS)

### `deny_non_service_role`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | RESTRICTIVE |
| roles | public |
| USING | `false` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
