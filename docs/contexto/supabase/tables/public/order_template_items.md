# public.order_template_items

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
| 2 | `template_id` | `uuid` | não |  |  |  |
| 3 | `product_id` | `text` | não |  |  |  |
| 4 | `variant_sku` | `text` | sim |  |  |  |
| 5 | `product_name` | `text` | sim |  |  |  |
| 6 | `quantity` | `integer` | não |  |  |  |
| 7 | `unit_price` | `numeric(14,4)` | sim |  |  |  |
| 8 | `notes` | `text` | sim |  |  |  |
| 9 | `position` | `integer` | não | `0` |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| order_template_items_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| order_template_items_quantity_check | CHECK | `CHECK (quantity > 0)` |  |  | sim |
| order_template_items_template_id_fkey | FOREIGN KEY | `FOREIGN KEY (template_id) REFERENCES order_templates(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_template_items_template | btree | template_id, position | não | sim |  | `CREATE INDEX idx_template_items_template ON public.order_template_items USING btree (template_id, "position")` |
| order_template_items_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX order_template_items_pkey ON public.order_template_items USING btree (id)` |


## Policies (RLS)

### `template_items_delete_via_template`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM order_templates t   WHERE ((t.id = order_template_items.template_id) AND (t.user_id = ( SELECT auth.uid() AS uid)))))` |
| WITH CHECK |  |

### `template_items_deny_anon`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | anon |
| USING | `false` |
| WITH CHECK | `false` |

### `template_items_insert_via_template`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM order_templates t   WHERE ((t.id = order_template_items.template_id) AND (t.user_id = ( SELECT auth.uid() AS uid)))))` |

### `template_items_select_via_template`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM order_templates t   WHERE ((t.id = order_template_items.template_id) AND ((t.user_id = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'manager'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'dev'::app_role)))))` |
| WITH CHECK |  |

### `template_items_update_via_template`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM order_templates t   WHERE ((t.id = order_template_items.template_id) AND (t.user_id = ( SELECT auth.uid() AS uid)))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM order_templates t   WHERE ((t.id = order_template_items.template_id) AND (t.user_id = ( SELECT auth.uid() AS uid)))))` |


## Triggers

_nenhum_


## Grants

_nenhum_
