# public.product_group_locations

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
| 2 | `group_component_id` | `uuid` | não |  |  |  |
| 3 | `location_code` | `text` | não |  |  |  |
| 4 | `location_name` | `text` | não |  |  |  |
| 5 | `max_width_cm` | `numeric(10,2)` | sim |  |  |  |
| 6 | `max_height_cm` | `numeric(10,2)` | sim |  |  |  |
| 7 | `max_area_cm2` | `numeric(10,2)` | sim |  |  |  |
| 8 | `area_image_url` | `text` | sim |  |  |  |
| 9 | `is_active` | `boolean` | não | `true` |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_group_locations_group_component_id_fkey | FOREIGN KEY | `FOREIGN KEY (group_component_id) REFERENCES product_group_components(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_group_locations_group_component_id_location_code_key | UNIQUE | `UNIQUE (group_component_id, location_code)` |  |  | sim |
| product_group_locations_max_area_cm2_check | CHECK | `CHECK (max_area_cm2 IS NULL OR max_area_cm2 > 0::numeric)` |  |  | sim |
| product_group_locations_max_height_cm_check | CHECK | `CHECK (max_height_cm IS NULL OR max_height_cm > 0::numeric)` |  |  | sim |
| product_group_locations_max_width_cm_check | CHECK | `CHECK (max_width_cm IS NULL OR max_width_cm > 0::numeric)` |  |  | sim |
| product_group_locations_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.product_group_location_techniques | product_group_location_techniques_group_location_id_fkey | group_location_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| product_group_locations_component_idx | btree | group_component_id | não | sim |  | `CREATE INDEX product_group_locations_component_idx ON public.product_group_locations USING btree (group_component_id)` |
| product_group_locations_group_component_id_location_code_key | btree | group_component_id, location_code | sim | sim |  | `CREATE UNIQUE INDEX product_group_locations_group_component_id_location_code_key ON public.product_group_locations USING btree (group_component_id, location_code)` |
| product_group_locations_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_group_locations_pkey ON public.product_group_locations USING btree (id)` |


## Policies (RLS)

### `sicoob_merged_118ef2a1d42b93e8_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role))` |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role))` |

### `sicoob_merged_449b75c983b5540f_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role))` |
| WITH CHECK |  |

### `sicoob_merged_d51a57d814c62123_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role))` |

### `sicoob_merged_e42dca6d4246703b_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND true))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
