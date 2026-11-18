# public.bitrix_deals

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
| 2 | `bitrix_id` | `text` | não |  |  |  |
| 3 | `bitrix_client_id` | `text` | não |  |  |  |
| 4 | `title` | `text` | não |  |  |  |
| 5 | `value` | `numeric(12,2)` | não | `0` |  |  |
| 6 | `currency` | `text` | não | `'BRL'::text` |  |  |
| 7 | `stage` | `text` | sim |  |  |  |
| 8 | `close_date` | `timestamp with time zone` | sim |  |  |  |
| 9 | `created_at_bitrix` | `timestamp with time zone` | sim |  |  |  |
| 10 | `synced_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| bitrix_deals_bitrix_id_key | UNIQUE | `UNIQUE (bitrix_id)` |  |  | sim |
| bitrix_deals_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| bitrix_deals_bitrix_id_key | btree | bitrix_id | sim | sim |  | `CREATE UNIQUE INDEX bitrix_deals_bitrix_id_key ON public.bitrix_deals USING btree (bitrix_id)` |
| bitrix_deals_client_idx | btree | bitrix_client_id | não | sim |  | `CREATE INDEX bitrix_deals_client_idx ON public.bitrix_deals USING btree (bitrix_client_id)` |
| bitrix_deals_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX bitrix_deals_pkey ON public.bitrix_deals USING btree (id)` |


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
