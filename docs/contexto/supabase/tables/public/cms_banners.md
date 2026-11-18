# public.cms_banners

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
| 2 | `title` | `text` | não |  |  |  |
| 3 | `image_url` | `text` | não |  |  |  |
| 4 | `link_url` | `text` | sim |  |  |  |
| 5 | `position` | `text` | sim | `'home_top'::text` |  |  |
| 6 | `start_at` | `timestamp with time zone` | sim |  |  |  |
| 7 | `end_at` | `timestamp with time zone` | sim |  |  |  |
| 8 | `is_active` | `boolean` | sim | `true` |  |  |
| 9 | `sort_order` | `integer` | sim | `0` |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| cms_banners_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| cms_banners_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX cms_banners_pkey ON public.cms_banners USING btree (id)` |


## Policies (RLS)

### `sicoob_anon_cms_banners_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon |
| USING | `(is_active IS TRUE)` |
| WITH CHECK |  |

### `sicoob_merged_0f16ee4cfce46108_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((true AND (is_active = true)) OR (true AND is_supervisor_or_above(( SELECT auth.uid() AS uid))))` |
| WITH CHECK |  |

### `sicoob_merged_470feaffa19762a3_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(true AND is_supervisor_or_above(( SELECT auth.uid() AS uid)))` |
| WITH CHECK |  |

### `sicoob_merged_762c7f32cc38c680_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `(true AND is_supervisor_or_above(( SELECT auth.uid() AS uid)))` |

### `sicoob_merged_ef50a24d99ec92ac_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(true AND is_supervisor_or_above(( SELECT auth.uid() AS uid)))` |
| WITH CHECK | `(true AND is_supervisor_or_above(( SELECT auth.uid() AS uid)))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_updated_at_banners | BEFORE | UPDATE | ROW | enabled | public.handle_updated_at |


## Grants

_nenhum_
