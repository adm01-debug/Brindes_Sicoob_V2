# public.product_price_freshness_overrides

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `product_id` | `text` | não |  |  |  |
| 3 | `threshold_days` | `integer` | não |  |  |  |
| 4 | `updated_by` | `uuid` | sim |  |  |  |
| 5 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 6 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_price_freshness_overrides_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_price_freshness_overrides_product_id_key | UNIQUE | `UNIQUE (product_id)` |  |  | sim |
| product_price_freshness_overrides_threshold_days_check | CHECK | `CHECK (threshold_days = ANY (ARRAY[30, 60, 90]))` |  |  | sim |
| product_price_freshness_overrides_updated_by_fkey | FOREIGN KEY | `FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pfo_product_id | btree | product_id | não | sim |  | `CREATE INDEX idx_pfo_product_id ON public.product_price_freshness_overrides USING btree (product_id)` |
| idx_product_price_freshness_overrides_updated_by | btree | updated_by | não | sim |  | `CREATE INDEX idx_product_price_freshness_overrides_updated_by ON public.product_price_freshness_overrides USING btree (updated_by)` |
| product_price_freshness_overrides_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_price_freshness_overrides_pkey ON public.product_price_freshness_overrides USING btree (id)` |
| product_price_freshness_overrides_product_id_key | btree | product_id | sim | sim |  | `CREATE UNIQUE INDEX product_price_freshness_overrides_product_id_key ON public.product_price_freshness_overrides USING btree (product_id)` |


## Policies (RLS)

### `Admins can delete freshness overrides`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin(( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |

### `Admins can insert freshness overrides`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_admin(( SELECT auth.uid() AS uid))` |

### `Admins can update freshness overrides`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin(( SELECT auth.uid() AS uid))` |
| WITH CHECK | `is_admin(( SELECT auth.uid() AS uid))` |

### `Authenticated can read freshness overrides`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_pfo_set_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
