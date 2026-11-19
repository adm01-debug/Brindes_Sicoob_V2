# public.quote_item_personalizations

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
| 2 | `quote_item_id` | `uuid` | não |  |  |  |
| 3 | `technique_id` | `text` | sim |  |  |  |
| 4 | `technique_name` | `text` | sim |  |  |  |
| 5 | `colors_count` | `integer` | sim | `1` |  |  |
| 6 | `positions_count` | `integer` | sim | `1` |  |  |
| 7 | `area_cm2` | `numeric` | sim |  |  |  |
| 8 | `width_cm` | `numeric` | sim |  |  |  |
| 9 | `height_cm` | `numeric` | sim |  |  |  |
| 10 | `personalized_quantity` | `integer` | sim |  |  |  |
| 11 | `setup_cost` | `numeric` | sim | `0` |  |  |
| 12 | `unit_cost` | `numeric` | sim | `0` |  |  |
| 13 | `total_cost` | `numeric` | sim | `0` |  |  |
| 14 | `notes` | `text` | sim |  |  |  |
| 15 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 16 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 17 | `catalog_checked_at` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| quote_item_personalizations_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| quote_item_personalizations_quote_item_id_fkey | FOREIGN KEY | `FOREIGN KEY (quote_item_id) REFERENCES quote_items(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_quote_item_personalizations_quote_item_id | btree | quote_item_id | não | sim |  | `CREATE INDEX idx_quote_item_personalizations_quote_item_id ON public.quote_item_personalizations USING btree (quote_item_id)` |
| quote_item_personalizations_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX quote_item_personalizations_pkey ON public.quote_item_personalizations USING btree (id)` |


## Policies (RLS)

### `quote_item_personalizations_delete_scope`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(can_view_all_sales() OR (EXISTS ( SELECT 1    FROM (quote_items qi      JOIN quotes q ON ((q.id = qi.quote_id)))   WHERE ((qi.id = quote_item_personalizations.quote_item_id) AND (q.seller_id = ( SELECT auth.uid() AS uid))))))` |
| WITH CHECK |  |

### `quote_item_personalizations_insert_scope`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `(can_view_all_sales() OR (EXISTS ( SELECT 1    FROM (quote_items qi      JOIN quotes q ON ((q.id = qi.quote_id)))   WHERE ((qi.id = quote_item_personalizations.quote_item_id) AND (q.seller_id = ( SELECT auth.uid() AS uid))))))` |

### `quote_item_personalizations_select_scope`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(can_view_all_sales() OR (EXISTS ( SELECT 1    FROM (quote_items qi      JOIN quotes q ON ((q.id = qi.quote_id)))   WHERE ((qi.id = quote_item_personalizations.quote_item_id) AND ((q.seller_id = ( SELECT auth.uid() AS uid)) OR (has_role(( SELECT auth.uid() AS uid), 'supervisor'::app_role) AND ((q.organization_id IS NULL) OR (q.organization_id IN ( SELECT get_user_org_ids(( SELECT auth.uid() AS uid)) AS get_user_org_ids)))))))))` |
| WITH CHECK |  |

### `quote_item_personalizations_update_scope`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(can_view_all_sales() OR (EXISTS ( SELECT 1    FROM (quote_items qi      JOIN quotes q ON ((q.id = qi.quote_id)))   WHERE ((qi.id = quote_item_personalizations.quote_item_id) AND ((q.seller_id = ( SELECT auth.uid() AS uid)) OR (has_role(( SELECT auth.uid() AS uid), 'supervisor'::app_role) AND ((q.organization_id IS NULL) OR (q.organization_id IN ( SELECT get_user_org_ids(( SELECT auth.uid() AS uid)) AS get_user_org_ids)))))))))` |
| WITH CHECK | `(can_view_all_sales() OR (EXISTS ( SELECT 1    FROM (quote_items qi      JOIN quotes q ON ((q.id = qi.quote_id)))   WHERE ((qi.id = quote_item_personalizations.quote_item_id) AND ((q.seller_id = ( SELECT auth.uid() AS uid)) OR (has_role(( SELECT auth.uid() AS uid), 'supervisor'::app_role) AND ((q.organization_id IS NULL) OR (q.organization_id IN ( SELECT get_user_org_ids(( SELECT auth.uid() AS uid)) AS get_user_org_ids)))))))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| aaa_guard_quote_personalization_content_write | BEFORE | INSERT OR DELETE OR UPDATE | ROW | enabled | public.guard_quote_personalization_content_write |
| zzz_guard_quote_personalization_price_attestation | BEFORE | INSERT OR DELETE OR UPDATE | ROW | enabled | public.guard_quote_price_attestation |


## Grants

_nenhum_
