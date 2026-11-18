# public.sicoob_approval_delivery_archive

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
| 1 | `archive_id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `delivery_id` | `uuid` | não |  |  |  |
| 3 | `delivery_record` | `jsonb` | não |  |  |  |
| 4 | `retention_reason` | `text` | não |  |  |  |
| 5 | `archived_at` | `timestamp with time zone` | não | `clock_timestamp()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sicoob_approval_delivery_archive_delivery_id_key | UNIQUE | `UNIQUE (delivery_id)` |  |  | sim |
| sicoob_approval_delivery_archive_pkey | PRIMARY KEY | `PRIMARY KEY (archive_id)` |  |  | sim |
| sicoob_approval_delivery_archive_retention_reason_check | CHECK | `CHECK (retention_reason = ANY (ARRAY['delivered_or_cancelled_180d'::text, 'failed_or_uncertain_365d'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| sicoob_approval_delivery_archive_delivery_id_key | btree | delivery_id | sim | sim |  | `CREATE UNIQUE INDEX sicoob_approval_delivery_archive_delivery_id_key ON public.sicoob_approval_delivery_archive USING btree (delivery_id)` |
| sicoob_approval_delivery_archive_pkey | btree | archive_id | sim | sim |  | `CREATE UNIQUE INDEX sicoob_approval_delivery_archive_pkey ON public.sicoob_approval_delivery_archive USING btree (archive_id)` |


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
