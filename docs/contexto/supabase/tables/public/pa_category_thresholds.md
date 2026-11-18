# public.pa_category_thresholds

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
| 2 | `pa_id` | `uuid` | sim |  |  |  |
| 3 | `category_id` | `integer` | sim |  |  |  |
| 4 | `limite_alcada` | `numeric(12,2)` | não |  |  |  |
| 5 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| pa_category_thresholds_pa_id_category_id_key | UNIQUE | `UNIQUE (pa_id, category_id)` |  |  | sim |
| pa_category_thresholds_pa_id_fkey | FOREIGN KEY | `FOREIGN KEY (pa_id) REFERENCES postos_atendimento(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| pa_category_thresholds_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_category_threshold_lookup | btree | pa_id, category_id | não | sim |  | `CREATE INDEX idx_category_threshold_lookup ON public.pa_category_thresholds USING btree (pa_id, category_id)` |
| pa_category_thresholds_pa_id_category_id_key | btree | pa_id, category_id | sim | sim |  | `CREATE UNIQUE INDEX pa_category_thresholds_pa_id_category_id_key ON public.pa_category_thresholds USING btree (pa_id, category_id)` |
| pa_category_thresholds_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX pa_category_thresholds_pkey ON public.pa_category_thresholds USING btree (id)` |


## Policies (RLS)

### `sicoob_merged_232d08c4ab3de2c6_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid)))` |
| WITH CHECK |  |

### `sicoob_merged_3f36d649c0c1be95_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid)))` |

### `sicoob_merged_8992dbfc5abe1a8e_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND true))` |
| WITH CHECK |  |

### `sicoob_merged_b5ab7c2d3d96b9eb_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid)))` |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid)))` |


## Triggers

_nenhum_


## Grants

_nenhum_
