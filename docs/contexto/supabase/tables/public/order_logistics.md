# public.order_logistics

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
| 2 | `order_id` | `uuid` | não |  |  |  |
| 3 | `tracking_code` | `text` | sim |  |  |  |
| 4 | `carrier_name` | `text` | sim |  |  |  |
| 5 | `estimated_delivery` | `timestamp with time zone` | sim |  |  |  |
| 6 | `actual_delivery` | `timestamp with time zone` | sim |  |  |  |
| 7 | `delivery_photo_url` | `text` | sim |  |  |  |
| 8 | `delivery_status` | `text` | sim | `'pending'::text` |  |  |
| 9 | `notes` | `text` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| order_logistics_order_id_fkey | FOREIGN KEY | `FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| order_logistics_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_order_logistics_order_id | btree | order_id | não | sim |  | `CREATE INDEX idx_order_logistics_order_id ON public.order_logistics USING btree (order_id)` |
| order_logistics_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX order_logistics_pkey ON public.order_logistics USING btree (id)` |


## Policies (RLS)

### `sicoob_merged_3b0ed3ce6c322016_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND ((EXISTS ( SELECT 1    FROM orders o   WHERE ((o.id = order_logistics.order_id) AND ((o.seller_id = ( SELECT auth.uid() AS uid)) OR (o.organization_id IN ( SELECT get_user_org_ids(( SELECT auth.uid() AS uid)) AS get_user_org_ids)))))) OR is_admin(( SELECT auth.uid() AS uid)))))` |
| WITH CHECK |  |

### `sicoob_merged_7ab066f22e04507b_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid)))` |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid)))` |

### `sicoob_merged_d93234a78eda346b_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid)))` |

### `sicoob_merged_e716ca12fe3b2d55_delete`

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
