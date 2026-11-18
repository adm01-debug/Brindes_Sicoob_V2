# public.generated_mockups

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
| 2 | `seller_id` | `uuid` | não |  |  |  |
| 3 | `client_id` | `text` | sim |  |  |  |
| 4 | `client_name` | `text` | sim |  |  |  |
| 5 | `product_id` | `text` | sim |  |  |  |
| 6 | `product_name` | `text` | sim |  |  |  |
| 7 | `product_sku` | `text` | sim |  |  |  |
| 8 | `technique_id` | `text` | sim |  |  |  |
| 9 | `technique_name` | `text` | sim |  |  |  |
| 10 | `logo_url` | `text` | sim |  |  |  |
| 11 | `mockup_url` | `text` | sim |  |  |  |
| 12 | `layout_url` | `text` | sim |  |  |  |
| 13 | `position_x` | `numeric` | sim |  |  |  |
| 14 | `position_y` | `numeric` | sim |  |  |  |
| 15 | `logo_width_cm` | `numeric` | sim |  |  |  |
| 16 | `logo_height_cm` | `numeric` | sim |  |  |  |
| 17 | `location_name` | `text` | sim |  |  |  |
| 18 | `colors_count` | `integer` | sim |  |  |  |
| 19 | `annotations` | `jsonb` | sim |  |  |  |
| 20 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| generated_mockups_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| generated_mockups_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX generated_mockups_pkey ON public.generated_mockups USING btree (id)` |


## Policies (RLS)

### `Users can manage own mockups`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(seller_id = ( SELECT auth.uid() AS uid))` |
| WITH CHECK | `(seller_id = ( SELECT auth.uid() AS uid))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_owner__generated_mockups__seller_id | BEFORE | INSERT | ROW | enabled | public.enforce_seller_id_owner |


## Grants

_nenhum_
