# public.personalization_simulations

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
| 2 | `seller_id` | `uuid` | não |  |  |  |
| 3 | `client_id` | `text` | sim |  |  |  |
| 4 | `product_id` | `text` | sim |  |  |  |
| 5 | `product_name` | `text` | não |  |  |  |
| 6 | `product_sku` | `text` | sim |  |  |  |
| 7 | `quantity` | `integer` | não | `1` |  |  |
| 8 | `product_unit_price` | `numeric` | não | `0` |  |  |
| 9 | `simulation_data` | `jsonb` | não | `'[]'::jsonb` |  |  |
| 10 | `notes` | `text` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| personalization_simulations_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| personalization_simulations_product_unit_price_check | CHECK | `CHECK (product_unit_price >= 0::numeric)` |  |  | sim |
| personalization_simulations_quantity_check | CHECK | `CHECK (quantity > 0)` |  |  | sim |
| personalization_simulations_seller_id_fkey | FOREIGN KEY | `FOREIGN KEY (seller_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| personalization_simulations_simulation_data_check | CHECK | `CHECK (jsonb_typeof(simulation_data) = 'array'::text)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| personalization_simulations_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX personalization_simulations_pkey ON public.personalization_simulations USING btree (id)` |
| personalization_simulations_seller_created_idx | btree | seller_id, created_at | não | sim |  | `CREATE INDEX personalization_simulations_seller_created_idx ON public.personalization_simulations USING btree (seller_id, created_at DESC)` |


## Policies (RLS)

### `personalization_simulations_owner_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(seller_id = ( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |

### `personalization_simulations_owner_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(seller_id = ( SELECT auth.uid() AS uid))` |

### `personalization_simulations_owner_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(seller_id = ( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |

### `personalization_simulations_owner_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(seller_id = ( SELECT auth.uid() AS uid))` |
| WITH CHECK | `(seller_id = ( SELECT auth.uid() AS uid))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_personalization_simulations_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
