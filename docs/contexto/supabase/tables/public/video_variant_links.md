# public.video_variant_links

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
| 2 | `video_id` | `text` | não |  |  |  |
| 3 | `variant_id` | `text` | não |  |  |  |
| 4 | `variant_name` | `text` | sim |  |  |  |
| 5 | `variant_color_hex` | `text` | sim |  |  |  |
| 6 | `supplier_code` | `text` | sim |  |  |  |
| 7 | `product_id` | `text` | não |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| video_variant_links_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| video_variant_links_video_id_variant_id_key | UNIQUE | `UNIQUE (video_id, variant_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| video_variant_links_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX video_variant_links_pkey ON public.video_variant_links USING btree (id)` |
| video_variant_links_video_id_variant_id_key | btree | video_id, variant_id | sim | sim |  | `CREATE UNIQUE INDEX video_variant_links_video_id_variant_id_key ON public.video_variant_links USING btree (video_id, variant_id)` |


## Policies (RLS)

### `sicoob_merged_0fb14831cc83cede_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid)))` |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid)))` |

### `sicoob_merged_658810f25aca329c_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND true))` |
| WITH CHECK |  |

### `sicoob_merged_7a07c257e1f13187_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid)))` |

### `sicoob_merged_afbe2c8c5da93cea_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid)))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
