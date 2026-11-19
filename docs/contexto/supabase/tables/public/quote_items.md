# public.quote_items

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
| 2 | `quote_id` | `uuid` | não |  |  |  |
| 3 | `product_id` | `text` | sim |  |  |  |
| 4 | `product_name` | `text` | não |  |  |  |
| 5 | `product_sku` | `text` | sim |  |  |  |
| 6 | `product_image_url` | `text` | sim |  |  |  |
| 7 | `quantity` | `integer` | não | `1` |  |  |
| 8 | `unit_price` | `numeric` | não | `0` |  |  |
| 9 | `subtotal` | `numeric` | sim |  |  |  |
| 10 | `color_name` | `text` | sim |  |  |  |
| 11 | `color_hex` | `text` | sim |  |  |  |
| 12 | `notes` | `text` | sim |  |  |  |
| 13 | `sort_order` | `integer` | sim | `0` |  |  |
| 14 | `display_order` | `integer` | sim |  |  |  |
| 15 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 16 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 17 | `kit_group_id` | `text` | sim |  |  |  |
| 18 | `kit_name` | `text` | sim |  |  |  |
| 19 | `size_code` | `text` | sim |  |  |  |
| 20 | `gender` | `text` | sim |  |  |  |
| 21 | `price_confirmed_at` | `timestamp with time zone` | sim |  |  |  |
| 22 | `unit_cost` | `numeric` | sim | `0` |  |  |
| 23 | `source_variant_id` | `text` | sim |  |  |  |
| 24 | `source_variant_sku` | `text` | sim |  |  |  |
| 25 | `catalog_checked_at` | `timestamp with time zone` | sim |  |  |  |
| 26 | `catalog_available_stock` | `integer` | sim |  |  |  |
| 27 | `catalog_minimum_quantity` | `integer` | sim |  |  |  |
| 28 | `catalog_valid_until` | `timestamp with time zone` | sim |  |  |  |
| 29 | `historical_unit_price` | `numeric(14,4)` | sim |  |  |  |
| 30 | `price_changed` | `boolean` | não | `false` |  |  |
| 31 | `catalog_stock_is_reserved` | `boolean` | não | `false` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| quote_items_catalog_minimum_check | CHECK | `CHECK (catalog_minimum_quantity IS NULL OR catalog_minimum_quantity > 0)` |  |  | sim |
| quote_items_catalog_not_reservation_check | CHECK | `CHECK (catalog_stock_is_reserved IS FALSE)` |  |  | sim |
| quote_items_catalog_stock_check | CHECK | `CHECK (catalog_available_stock IS NULL OR catalog_available_stock >= 0)` |  |  | sim |
| quote_items_historical_price_check | CHECK | `CHECK (historical_unit_price IS NULL OR historical_unit_price >= 0::numeric)` |  |  | sim |
| quote_items_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| quote_items_quote_id_fkey | FOREIGN KEY | `FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.quote_item_personalizations | quote_item_personalizations_quote_item_id_fkey | quote_item_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_quote_items_quote_id | btree | quote_id | não | sim |  | `CREATE INDEX idx_quote_items_quote_id ON public.quote_items USING btree (quote_id)` |
| quote_items_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX quote_items_pkey ON public.quote_items USING btree (id)` |


## Policies (RLS)

### `quote_items_delete_scope`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(can_view_all_sales() OR (EXISTS ( SELECT 1    FROM quotes q   WHERE ((q.id = quote_items.quote_id) AND (q.seller_id = ( SELECT auth.uid() AS uid))))))` |
| WITH CHECK |  |

### `quote_items_insert_scope`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `(can_view_all_sales() OR (EXISTS ( SELECT 1    FROM quotes q   WHERE ((q.id = quote_items.quote_id) AND (q.seller_id = ( SELECT auth.uid() AS uid))))))` |

### `quote_items_select_scope`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(can_view_all_sales() OR (EXISTS ( SELECT 1    FROM quotes q   WHERE ((q.id = quote_items.quote_id) AND ((q.seller_id = ( SELECT auth.uid() AS uid)) OR (has_role(( SELECT auth.uid() AS uid), 'supervisor'::app_role) AND ((q.organization_id IS NULL) OR (q.organization_id IN ( SELECT get_user_org_ids(( SELECT auth.uid() AS uid)) AS get_user_org_ids)))))))))` |
| WITH CHECK |  |

### `quote_items_update_scope`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(can_view_all_sales() OR (EXISTS ( SELECT 1    FROM quotes q   WHERE ((q.id = quote_items.quote_id) AND ((q.seller_id = ( SELECT auth.uid() AS uid)) OR (has_role(( SELECT auth.uid() AS uid), 'supervisor'::app_role) AND ((q.organization_id IS NULL) OR (q.organization_id IN ( SELECT get_user_org_ids(( SELECT auth.uid() AS uid)) AS get_user_org_ids)))))))))` |
| WITH CHECK | `(can_view_all_sales() OR (EXISTS ( SELECT 1    FROM quotes q   WHERE ((q.id = quote_items.quote_id) AND ((q.seller_id = ( SELECT auth.uid() AS uid)) OR (has_role(( SELECT auth.uid() AS uid), 'supervisor'::app_role) AND ((q.organization_id IS NULL) OR (q.organization_id IN ( SELECT get_user_org_ids(( SELECT auth.uid() AS uid)) AS get_user_org_ids)))))))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| aaa_guard_quote_item_content_write | BEFORE | INSERT OR DELETE OR UPDATE | ROW | enabled | public.guard_quote_item_content_write |
| update_quote_items_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| zzz_guard_quote_item_price_attestation | BEFORE | INSERT OR DELETE OR UPDATE | ROW | enabled | public.guard_quote_price_attestation |


## Grants

_nenhum_
