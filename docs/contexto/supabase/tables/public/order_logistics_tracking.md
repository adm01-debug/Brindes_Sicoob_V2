# public.order_logistics_tracking

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
| 2 | `order_id` | `uuid` | não |  |  |  |
| 3 | `tracking_code` | `text` | sim |  |  |  |
| 4 | `carrier` | `text` | sim |  |  |  |
| 5 | `carrier_url` | `text` | sim |  |  |  |
| 6 | `estimated_delivery` | `date` | sim |  |  |  |
| 7 | `actual_delivery_at` | `timestamp with time zone` | sim |  |  |  |
| 8 | `delivery_photo_url` | `text` | sim |  |  |  |
| 9 | `recipient_name` | `text` | sim |  |  |  |
| 10 | `weight_kg` | `numeric(10,3)` | sim |  |  |  |
| 11 | `volumes` | `integer` | sim |  |  |  |
| 12 | `notes` | `text` | sim |  |  |  |
| 13 | `created_by` | `uuid` | sim |  |  |  |
| 14 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| order_logistics_tracking_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| order_logistics_tracking_order_id_fkey | FOREIGN KEY | `FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| order_logistics_tracking_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_fk_order_logistics_tracking_created_by_fkey | btree | created_by | não | sim |  | `CREATE INDEX idx_fk_order_logistics_tracking_created_by_fkey ON public.order_logistics_tracking USING btree (created_by)` |
| idx_logistics_order | btree | order_id | não | sim |  | `CREATE INDEX idx_logistics_order ON public.order_logistics_tracking USING btree (order_id)` |
| idx_logistics_tracking_code | btree | tracking_code | não | sim | `(tracking_code IS NOT NULL)` | `CREATE INDEX idx_logistics_tracking_code ON public.order_logistics_tracking USING btree (tracking_code) WHERE (tracking_code IS NOT NULL)` |
| order_logistics_tracking_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX order_logistics_tracking_pkey ON public.order_logistics_tracking USING btree (id)` |


## Policies (RLS)

### `logistics_delete_admin`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'dev'::app_role))` |
| WITH CHECK |  |

### `logistics_deny_anon`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | anon |
| USING | `false` |
| WITH CHECK | `false` |

### `logistics_insert_owner_admin`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_order_owner_or_admin(order_id)` |

### `logistics_select_owner_admin`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_order_owner_or_admin(order_id)` |
| WITH CHECK |  |

### `logistics_update_owner_admin`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_order_owner_or_admin(order_id)` |
| WITH CHECK | `is_order_owner_or_admin(order_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_order_logistics_tracking_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
