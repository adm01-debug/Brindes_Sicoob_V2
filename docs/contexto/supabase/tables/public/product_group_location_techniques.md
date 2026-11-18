# public.product_group_location_techniques

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
| 2 | `group_location_id` | `uuid` | não |  |  |  |
| 3 | `technique_id` | `text` | não |  |  |  |
| 4 | `technique_code` | `text` | não |  |  |  |
| 5 | `max_colors` | `integer` | sim |  |  |  |
| 6 | `is_default` | `boolean` | não | `false` |  |  |
| 7 | `is_active` | `boolean` | não | `true` |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_group_location_techni_group_location_id_technique_i_key | UNIQUE | `UNIQUE (group_location_id, technique_id)` |  |  | sim |
| product_group_location_techniques_group_location_id_fkey | FOREIGN KEY | `FOREIGN KEY (group_location_id) REFERENCES product_group_locations(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_group_location_techniques_max_colors_check | CHECK | `CHECK (max_colors IS NULL OR max_colors > 0)` |  |  | sim |
| product_group_location_techniques_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_group_location_techniques_technique_code_check | CHECK | `CHECK (length(btrim(technique_code)) > 0)` |  |  | sim |
| product_group_location_techniques_technique_id_check | CHECK | `CHECK (length(btrim(technique_id)) > 0)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| product_group_location_techni_group_location_id_technique_i_key | btree | group_location_id, technique_id | sim | sim |  | `CREATE UNIQUE INDEX product_group_location_techni_group_location_id_technique_i_key ON public.product_group_location_techniques USING btree (group_location_id, technique_id)` |
| product_group_location_techniques_location_idx | btree | group_location_id | não | sim |  | `CREATE INDEX product_group_location_techniques_location_idx ON public.product_group_location_techniques USING btree (group_location_id)` |
| product_group_location_techniques_one_default_idx | btree | group_location_id | sim | sim | `(is_default AND is_active)` | `CREATE UNIQUE INDEX product_group_location_techniques_one_default_idx ON public.product_group_location_techniques USING btree (group_location_id) WHERE (is_default AND is_active)` |
| product_group_location_techniques_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_group_location_techniques_pkey ON public.product_group_location_techniques USING btree (id)` |


## Policies (RLS)

### `sicoob_merged_2124979da37941ad_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND true))` |
| WITH CHECK |  |

### `sicoob_merged_26b8c2e1cf42694d_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role))` |

### `sicoob_merged_822637dfc01f97b2_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role))` |
| WITH CHECK |  |

### `sicoob_merged_ae71c6d1bc6954bb_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role))` |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role))` |


## Triggers

_nenhum_


## Grants

_nenhum_
