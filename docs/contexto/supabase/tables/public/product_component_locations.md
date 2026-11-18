# public.product_component_locations

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
| 2 | `component_id` | `uuid` | não |  |  |  |
| 3 | `location_code` | `text` | não |  |  |  |
| 4 | `location_name` | `text` | não |  |  |  |
| 5 | `description` | `text` | sim |  |  |  |
| 6 | `max_width_cm` | `numeric(6,2)` | sim |  |  |  |
| 7 | `max_height_cm` | `numeric(6,2)` | sim |  |  |  |
| 8 | `is_active` | `boolean` | não | `true` |  |  |
| 9 | `sort_order` | `integer` | sim | `0` |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `deleted_at` | `timestamp with time zone` | sim |  |  |  |
| 13 | `max_area_cm2` | `numeric(10,2)` | sim |  |  |  |
| 14 | `area_image_url` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_component_locations_component_id_fkey | FOREIGN KEY | `FOREIGN KEY (component_id) REFERENCES product_components(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_component_locations_component_id_location_code_key | UNIQUE | `UNIQUE (component_id, location_code)` |  |  | sim |
| product_component_locations_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.product_component_location_techniques | product_component_location_technique_component_location_id_fkey | component_location_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_product_comp_loc_component | btree | component_id | não | sim |  | `CREATE INDEX idx_product_comp_loc_component ON public.product_component_locations USING btree (component_id)` |
| product_component_locations_component_id_location_code_key | btree | component_id, location_code | sim | sim |  | `CREATE UNIQUE INDEX product_component_locations_component_id_location_code_key ON public.product_component_locations USING btree (component_id, location_code)` |
| product_component_locations_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_component_locations_pkey ON public.product_component_locations USING btree (id)` |


## Policies (RLS)

### `sicoob_merged_57b8291a3ac8c7eb_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `(true AND is_admin(( SELECT auth.uid() AS uid)))` |

### `sicoob_merged_b2c35169361a307f_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((true AND is_admin(( SELECT auth.uid() AS uid))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND true))` |
| WITH CHECK |  |

### `sicoob_merged_de9237faca45d306_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(true AND is_admin(( SELECT auth.uid() AS uid)))` |
| WITH CHECK |  |

### `sicoob_merged_eca0fdc74e6c83a4_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(true AND is_admin(( SELECT auth.uid() AS uid)))` |
| WITH CHECK | `(true AND is_admin(( SELECT auth.uid() AS uid)))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_product_comp_loc_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
