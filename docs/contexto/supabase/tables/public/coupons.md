# public.coupons

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
| 2 | `code` | `text` | não |  |  |  |
| 3 | `discount_type` | `text` | não |  |  |  |
| 4 | `discount_value` | `numeric` | não |  |  |  |
| 5 | `min_purchase_amount` | `numeric` | sim | `0` |  |  |
| 6 | `max_discount_amount` | `numeric` | sim |  |  |  |
| 7 | `starts_at` | `timestamp with time zone` | sim |  |  |  |
| 8 | `expires_at` | `timestamp with time zone` | sim |  |  |  |
| 9 | `usage_limit` | `integer` | sim |  |  |  |
| 10 | `usage_count` | `integer` | sim | `0` |  |  |
| 11 | `is_active` | `boolean` | sim | `true` |  |  |
| 12 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 13 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| coupons_code_key | UNIQUE | `UNIQUE (code)` |  |  | sim |
| coupons_discount_type_check | CHECK | `CHECK (discount_type = ANY (ARRAY['percentage'::text, 'fixed_amount'::text]))` |  |  | sim |
| coupons_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| coupons_code_key | btree | code | sim | sim |  | `CREATE UNIQUE INDEX coupons_code_key ON public.coupons USING btree (code)` |
| coupons_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX coupons_pkey ON public.coupons USING btree (id)` |


## Policies (RLS)

### `Admins can manage coupons`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'dev'::app_role))` |
| WITH CHECK | `(has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'dev'::app_role))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_updated_at_coupons | BEFORE | UPDATE | ROW | enabled | public.handle_updated_at |


## Grants

_nenhum_
