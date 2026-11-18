# public.order_approval_history

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `order_id` | `uuid` | sim |  |  |  |
| 3 | `approver_id` | `uuid` | sim |  |  |  |
| 4 | `decision` | `text` | não |  |  |  |
| 5 | `subtotal_at_time` | `numeric(12,2)` | sim |  |  |  |
| 6 | `threshold_at_time` | `numeric(12,2)` | sim |  |  |  |
| 7 | `reason` | `text` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| order_approval_history_approver_id_fkey | FOREIGN KEY | `FOREIGN KEY (approver_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| order_approval_history_decision_check | CHECK | `CHECK (decision = ANY (ARRAY['approved'::text, 'rejected'::text, 'pending'::text]))` |  |  | sim |
| order_approval_history_order_id_fkey | FOREIGN KEY | `FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| order_approval_history_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_approval_history_order | btree | order_id | não | sim |  | `CREATE INDEX idx_approval_history_order ON public.order_approval_history USING btree (order_id)` |
| idx_fk_order_approval_history_approver_id_fkey | btree | approver_id | não | sim |  | `CREATE INDEX idx_fk_order_approval_history_approver_id_fkey ON public.order_approval_history USING btree (approver_id)` |
| order_approval_history_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX order_approval_history_pkey ON public.order_approval_history USING btree (id)` |


## Policies (RLS)

### `Approvers can insert history`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(( SELECT auth.uid() AS uid) = approver_id)` |

### `Users can view approval history for relevant orders`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((EXISTS ( SELECT 1    FROM orders o   WHERE ((o.id = order_approval_history.order_id) AND ((o.seller_id = ( SELECT auth.uid() AS uid)) OR (o.organization_id IN ( SELECT get_user_org_ids(( SELECT auth.uid() AS uid)) AS get_user_org_ids)))))) OR is_admin(( SELECT auth.uid() AS uid)))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
