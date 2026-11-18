# public.product_component_location_techniques

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
| 2 | `component_location_id` | `uuid` | não |  |  |  |
| 3 | `technique_id` | `text` | não |  |  |  |
| 4 | `composed_code` | `text` | não |  |  |  |
| 5 | `max_colors` | `integer` | sim |  |  |  |
| 6 | `is_default` | `boolean` | não | `false` |  |  |
| 7 | `is_active` | `boolean` | não | `true` |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_component_location_te_component_location_id_techniq_key | UNIQUE | `UNIQUE (component_location_id, technique_id)` |  |  | sim |
| product_component_location_technique_component_location_id_fkey | FOREIGN KEY | `FOREIGN KEY (component_location_id) REFERENCES product_component_locations(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_component_location_techniques_max_colors_check | CHECK | `CHECK (max_colors IS NULL OR max_colors > 0)` |  |  | sim |
| product_component_location_techniques_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_component_location_techniques_technique_id_check | CHECK | `CHECK (length(btrim(technique_id)) > 0)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| product_component_location_te_component_location_id_techniq_key | btree | component_location_id, technique_id | sim | sim |  | `CREATE UNIQUE INDEX product_component_location_te_component_location_id_techniq_key ON public.product_component_location_techniques USING btree (component_location_id, technique_id)` |
| product_component_location_techniques_location_idx | btree | component_location_id | não | sim |  | `CREATE INDEX product_component_location_techniques_location_idx ON public.product_component_location_techniques USING btree (component_location_id)` |
| product_component_location_techniques_one_default_idx | btree | component_location_id | sim | sim | `(is_default AND is_active)` | `CREATE UNIQUE INDEX product_component_location_techniques_one_default_idx ON public.product_component_location_techniques USING btree (component_location_id) WHERE (is_default AND is_active)` |
| product_component_location_techniques_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_component_location_techniques_pkey ON public.product_component_location_techniques USING btree (id)` |


## Policies (RLS)

### `sicoob_merged_22416ebd86d29b80_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role))` |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role))` |

### `sicoob_merged_2a1c30357a99caaa_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND true))` |
| WITH CHECK |  |

### `sicoob_merged_4f4797311dda2e5e_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role))` |

### `sicoob_merged_b0cf727759bc265f_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
