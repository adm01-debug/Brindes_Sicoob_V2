# public.quote_templates

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
| 2 | `seller_id` | `uuid` | não |  |  |  |
| 3 | `name` | `text` | não |  |  |  |
| 4 | `description` | `text` | sim |  |  |  |
| 5 | `is_default` | `boolean` | sim | `false` |  |  |
| 6 | `template_data` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 7 | `items_data` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 8 | `discount_percent` | `numeric` | sim | `0` |  |  |
| 9 | `discount_amount` | `numeric` | sim | `0` |  |  |
| 10 | `notes` | `text` | sim |  |  |  |
| 11 | `internal_notes` | `text` | sim |  |  |  |
| 12 | `payment_terms` | `text` | sim |  |  |  |
| 13 | `delivery_time` | `text` | sim |  |  |  |
| 14 | `validity_days` | `integer` | sim | `30` |  |  |
| 15 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 16 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 17 | `category` | `text` | sim |  |  |  |
| 18 | `is_public` | `boolean` | sim | `false` |  |  |
| 19 | `created_by` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| quote_templates_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| quote_templates_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_fk_quote_templates_created_by_fkey | btree | created_by | não | sim |  | `CREATE INDEX idx_fk_quote_templates_created_by_fkey ON public.quote_templates USING btree (created_by)` |
| idx_quote_templates_seller_id | btree | seller_id | não | sim |  | `CREATE INDEX idx_quote_templates_seller_id ON public.quote_templates USING btree (seller_id)` |
| quote_templates_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX quote_templates_pkey ON public.quote_templates USING btree (id)` |


## Policies (RLS)

### `sicoob_merged_08cfe83cc1c41746_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (is_public OR (created_by = ( SELECT auth.uid() AS uid)) OR (seller_id = ( SELECT auth.uid() AS uid)))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND ((created_by = ( SELECT auth.uid() AS uid)) OR (seller_id = ( SELECT auth.uid() AS uid)))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (can_view_all_sales() OR (seller_id = ( SELECT auth.uid() AS uid)))))` |
| WITH CHECK |  |

### `sicoob_merged_135c4b9a4f410ce6_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND ((created_by = ( SELECT auth.uid() AS uid)) OR (seller_id = ( SELECT auth.uid() AS uid)))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (can_view_all_sales() OR (seller_id = ( SELECT auth.uid() AS uid)))))` |

### `sicoob_merged_c53696859f4c4b98_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND ((created_by = ( SELECT auth.uid() AS uid)) OR (seller_id = ( SELECT auth.uid() AS uid)))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (can_view_all_sales() OR (seller_id = ( SELECT auth.uid() AS uid)))))` |
| WITH CHECK |  |

### `sicoob_merged_e0d7a2741331a0ff_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND ((created_by = ( SELECT auth.uid() AS uid)) OR (seller_id = ( SELECT auth.uid() AS uid)))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (can_view_all_sales() OR (seller_id = ( SELECT auth.uid() AS uid)))))` |
| WITH CHECK | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND ((created_by = ( SELECT auth.uid() AS uid)) OR (seller_id = ( SELECT auth.uid() AS uid)))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (can_view_all_sales() OR (seller_id = ( SELECT auth.uid() AS uid)))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_owner__quote_templates__seller_id | BEFORE | INSERT | ROW | enabled | public.enforce_seller_id_owner |
| update_quote_templates_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
