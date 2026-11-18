# public.product_categories

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 5 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `parent_id` | `uuid` | sim |  |  |  |
| 3 | `name` | `text` | não |  |  |  |
| 4 | `slug` | `text` | não |  |  |  |
| 5 | `description` | `text` | sim |  |  |  |
| 6 | `icon_url` | `text` | sim |  |  |  |
| 7 | `is_active` | `boolean` | sim | `true` |  |  |
| 8 | `sort_order` | `integer` | sim | `0` |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `deleted_at` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_categories_parent_id_fkey | FOREIGN KEY | `FOREIGN KEY (parent_id) REFERENCES product_categories(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_categories_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_categories_slug_key | UNIQUE | `UNIQUE (slug)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.product_categories | product_categories_parent_id_fkey | parent_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_fk_product_categories_parent_id_fkey | btree | parent_id | não | sim |  | `CREATE INDEX idx_fk_product_categories_parent_id_fkey ON public.product_categories USING btree (parent_id)` |
| idx_product_categories_deleted_at | btree | deleted_at | não | sim | `(deleted_at IS NULL)` | `CREATE INDEX idx_product_categories_deleted_at ON public.product_categories USING btree (deleted_at) WHERE (deleted_at IS NULL)` |
| product_categories_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_categories_pkey ON public.product_categories USING btree (id)` |
| product_categories_slug_key | btree | slug | sim | sim |  | `CREATE UNIQUE INDEX product_categories_slug_key ON public.product_categories USING btree (slug)` |


## Policies (RLS)

### `sicoob_anon_product_categories_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon |
| USING | `((deleted_at IS NULL) AND (is_active IS TRUE))` |
| WITH CHECK |  |

### `sicoob_merged_7cdb1183c4b74796_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((true AND (( SELECT auth.uid() AS uid) IN ( SELECT profiles.user_id    FROM profiles   WHERE (profiles.role = 'admin'::text)))) OR (true AND is_supervisor_or_above(( SELECT auth.uid() AS uid))))` |
| WITH CHECK |  |

### `sicoob_merged_c81902144623a175_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `((true AND (( SELECT auth.uid() AS uid) IN ( SELECT profiles.user_id    FROM profiles   WHERE (profiles.role = 'admin'::text)))) OR (true AND is_supervisor_or_above(( SELECT auth.uid() AS uid))))` |

### `sicoob_merged_f12af3216d680b95_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((true AND (( SELECT auth.uid() AS uid) IN ( SELECT profiles.user_id    FROM profiles   WHERE (profiles.role = 'admin'::text)))) OR (true AND is_supervisor_or_above(( SELECT auth.uid() AS uid))))` |
| WITH CHECK | `((true AND (( SELECT auth.uid() AS uid) IN ( SELECT profiles.user_id    FROM profiles   WHERE (profiles.role = 'admin'::text)))) OR (true AND is_supervisor_or_above(( SELECT auth.uid() AS uid))))` |

### `sicoob_merged_fc315fd6609a6a67_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((true AND (( SELECT auth.uid() AS uid) IN ( SELECT profiles.user_id    FROM profiles   WHERE (profiles.role = 'admin'::text)))) OR (true AND (is_active = true)) OR (true AND ((deleted_at IS NULL) AND (is_active = true))) OR (true AND is_supervisor_or_above(( SELECT auth.uid() AS uid))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_updated_at_categories | BEFORE | UPDATE | ROW | enabled | public.handle_updated_at |


## Grants

_nenhum_
