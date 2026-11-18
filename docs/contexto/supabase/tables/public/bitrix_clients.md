# public.bitrix_clients

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
| 3 | `name` | `text` | não |  |  |  |
| 4 | `ramo` | `text` | sim |  |  |  |
| 5 | `nicho` | `text` | sim |  |  |  |
| 6 | `primary_color_name` | `text` | sim |  |  |  |
| 7 | `primary_color_hex` | `text` | sim |  |  |  |
| 8 | `email` | `text` | sim |  |  |  |
| 9 | `phone` | `text` | sim |  |  |  |
| 10 | `address` | `text` | sim |  |  |  |
| 11 | `logo_url` | `text` | sim |  |  |  |
| 12 | `total_spent` | `numeric(12,2)` | não | `0` |  |  |
| 13 | `last_purchase_date` | `timestamp with time zone` | sim |  |  |  |
| 14 | `synced_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 16 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| bitrix_clients_bitrix_id_key | UNIQUE | `UNIQUE (bitrix_id)` |  |  | sim |
| bitrix_clients_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| bitrix_clients_bitrix_id_key | btree | bitrix_id | sim | sim |  | `CREATE UNIQUE INDEX bitrix_clients_bitrix_id_key ON public.bitrix_clients USING btree (bitrix_id)` |
| bitrix_clients_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX bitrix_clients_pkey ON public.bitrix_clients USING btree (id)` |


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

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_bitrix_clients_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
