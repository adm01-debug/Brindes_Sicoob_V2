# public.component_media

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
| 2 | `component_id` | `text` | não |  |  |  |
| 3 | `product_id` | `text` | não |  |  |  |
| 4 | `media_type` | `text` | não | `'image'::text` |  |  |
| 5 | `url` | `text` | não |  |  |  |
| 6 | `title` | `text` | sim |  |  |  |
| 7 | `sort_order` | `integer` | sim | `0` |  |  |
| 8 | `is_cover` | `boolean` | sim | `false` |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| component_media_media_type_check | CHECK | `CHECK (media_type = ANY (ARRAY['image'::text, 'video'::text]))` |  |  | sim |
| component_media_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| component_media_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX component_media_pkey ON public.component_media USING btree (id)` |


## Policies (RLS)

### `sicoob_merged_7be45586e72f3eff_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid)))` |
| WITH CHECK |  |

### `sicoob_merged_835d4f76a125571a_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid)))` |

### `sicoob_merged_9b0bd31ad897b29c_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND true))` |
| WITH CHECK |  |

### `sicoob_merged_c9889a0eabe3e2f8_update`

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
