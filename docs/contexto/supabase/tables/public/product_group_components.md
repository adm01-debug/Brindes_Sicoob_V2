# public.product_group_components

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
| 2 | `product_group_id` | `uuid` | não |  |  |  |
| 3 | `component_code` | `text` | não |  |  |  |
| 4 | `component_name` | `text` | não |  |  |  |
| 5 | `is_personalizable` | `boolean` | não | `true` |  |  |
| 6 | `is_active` | `boolean` | não | `true` |  |  |
| 7 | `sort_order` | `integer` | não | `0` |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_group_components_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_group_components_product_group_id_component_code_key | UNIQUE | `UNIQUE (product_group_id, component_code)` |  |  | sim |
| product_group_components_product_group_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_group_id) REFERENCES product_groups(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.product_group_locations | product_group_locations_group_component_id_fkey | group_component_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| product_group_components_group_order_idx | btree | product_group_id, sort_order | não | sim |  | `CREATE INDEX product_group_components_group_order_idx ON public.product_group_components USING btree (product_group_id, sort_order)` |
| product_group_components_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_group_components_pkey ON public.product_group_components USING btree (id)` |
| product_group_components_product_group_id_component_code_key | btree | product_group_id, component_code | sim | sim |  | `CREATE UNIQUE INDEX product_group_components_product_group_id_component_code_key ON public.product_group_components USING btree (product_group_id, component_code)` |


## Policies (RLS)

### `sicoob_merged_007fae7ef23f4b4d_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND true))` |
| WITH CHECK |  |

### `sicoob_merged_1432f367a58769b6_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role))` |
| WITH CHECK |  |

### `sicoob_merged_5149f9d983d4a125_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role))` |

### `sicoob_merged_cc6d98e25e76c2da_update`

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
