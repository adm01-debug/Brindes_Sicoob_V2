# public.product_sync_logs

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
| 2 | `source` | `text` | não |  |  |  |
| 3 | `status` | `text` | não | `'pending'::text` |  |  |
| 4 | `records_processed` | `integer` | não | `0` |  |  |
| 5 | `records_inserted` | `integer` | não | `0` |  |  |
| 6 | `records_updated` | `integer` | não | `0` |  |  |
| 7 | `records_failed` | `integer` | não | `0` |  |  |
| 8 | `duration_ms` | `integer` | sim |  |  |  |
| 9 | `payload` | `jsonb` | sim |  |  |  |
| 10 | `error_message` | `text` | sim |  |  |  |
| 11 | `triggered_by` | `uuid` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_sync_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_product_sync_logs_created | btree | created_at | não | sim |  | `CREATE INDEX idx_product_sync_logs_created ON public.product_sync_logs USING btree (created_at DESC)` |
| idx_product_sync_logs_source | btree | source, status | não | sim |  | `CREATE INDEX idx_product_sync_logs_source ON public.product_sync_logs USING btree (source, status)` |
| product_sync_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_sync_logs_pkey ON public.product_sync_logs USING btree (id)` |


## Policies (RLS)

### `Admins insert product sync logs`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `is_admin(( SELECT auth.uid() AS uid))` |

### `Admins view product sync logs`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `is_admin(( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
