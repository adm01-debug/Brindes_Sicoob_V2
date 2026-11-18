# public.order_items

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
| 3 | `product_id` | `text` | sim |  |  |  |
| 4 | `product_sku` | `text` | sim |  |  |  |
| 5 | `product_name` | `text` | sim |  |  |  |
| 6 | `product_image_url` | `text` | sim |  |  |  |
| 7 | `quantity` | `integer` | sim | `1` |  |  |
| 8 | `unit_price` | `numeric` | sim | `0` |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `organization_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| order_items_order_id_fkey | FOREIGN KEY | `FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| order_items_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id)` | NO ACTION | NO ACTION | sim |
| order_items_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_order_items_order_id | btree | order_id | não | sim |  | `CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id)` |
| idx_order_items_organization_id | btree | organization_id | não | sim |  | `CREATE INDEX idx_order_items_organization_id ON public.order_items USING btree (organization_id)` |
| order_items_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX order_items_pkey ON public.order_items USING btree (id)` |


## Policies (RLS)

### `order_items_delete_scope`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(can_view_all_sales() OR (EXISTS ( SELECT 1    FROM orders o   WHERE ((o.id = order_items.order_id) AND (o.seller_id = ( SELECT auth.uid() AS uid))))))` |
| WITH CHECK |  |

### `order_items_insert_scope`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(can_view_all_sales() OR (EXISTS ( SELECT 1    FROM orders o   WHERE ((o.id = order_items.order_id) AND (o.seller_id = ( SELECT auth.uid() AS uid))))))` |

### `order_items_select_scope`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(can_view_all_sales() OR (EXISTS ( SELECT 1    FROM orders o   WHERE ((o.id = order_items.order_id) AND ((o.seller_id = ( SELECT auth.uid() AS uid)) OR (has_role(( SELECT auth.uid() AS uid), 'supervisor'::app_role) AND ((o.organization_id IS NULL) OR (o.organization_id IN ( SELECT get_user_org_ids(( SELECT auth.uid() AS uid)) AS get_user_org_ids)))))))))` |
| WITH CHECK |  |

### `order_items_update_scope`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(can_view_all_sales() OR (EXISTS ( SELECT 1    FROM orders o   WHERE ((o.id = order_items.order_id) AND ((o.seller_id = ( SELECT auth.uid() AS uid)) OR (has_role(( SELECT auth.uid() AS uid), 'supervisor'::app_role) AND ((o.organization_id IS NULL) OR (o.organization_id IN ( SELECT get_user_org_ids(( SELECT auth.uid() AS uid)) AS get_user_org_ids)))))))))` |
| WITH CHECK | `(can_view_all_sales() OR (EXISTS ( SELECT 1    FROM orders o   WHERE ((o.id = order_items.order_id) AND ((o.seller_id = ( SELECT auth.uid() AS uid)) OR (has_role(( SELECT auth.uid() AS uid), 'supervisor'::app_role) AND ((o.organization_id IS NULL) OR (o.organization_id IN ( SELECT get_user_org_ids(( SELECT auth.uid() AS uid)) AS get_user_org_ids)))))))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_order_items_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
