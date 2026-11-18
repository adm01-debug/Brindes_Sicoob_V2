# public.price_history

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
| 2 | `product_id` | `text` | não |  |  |  |
| 3 | `variant_id` | `text` | sim |  |  |  |
| 4 | `price` | `numeric(12,2)` | não |  |  |  |
| 5 | `recorded_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| price_history_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_price_history_product_date | btree | product_id, recorded_at | não | sim |  | `CREATE INDEX idx_price_history_product_date ON public.price_history USING btree (product_id, recorded_at DESC)` |
| price_history_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX price_history_pkey ON public.price_history USING btree (id)` |


## Policies (RLS)

### `authenticated_read_price_history`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
