# public.order_pilot_approvals

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
| 3 | `order_item_id` | `uuid` | sim |  |  |  |
| 4 | `mockup_url` | `text` | não |  |  |  |
| 5 | `mockup_thumbnail_url` | `text` | sim |  |  |  |
| 6 | `status` | `text` | não | `'pending'::text` |  |  |
| 7 | `reviewer_name` | `text` | sim |  |  |  |
| 8 | `reviewer_notes` | `text` | sim |  |  |  |
| 9 | `reviewed_at` | `timestamp with time zone` | sim |  |  |  |
| 10 | `revision_round` | `integer` | não | `1` |  |  |
| 11 | `parent_approval_id` | `uuid` | sim |  |  |  |
| 12 | `created_by` | `uuid` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| order_pilot_approvals_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| order_pilot_approvals_order_id_fkey | FOREIGN KEY | `FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| order_pilot_approvals_parent_approval_id_fkey | FOREIGN KEY | `FOREIGN KEY (parent_approval_id) REFERENCES order_pilot_approvals(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| order_pilot_approvals_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| order_pilot_approvals_revision_round_check | CHECK | `CHECK (revision_round > 0)` |  |  | sim |
| order_pilot_approvals_status_check | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'revision'::text]))` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.order_pilot_approvals | order_pilot_approvals_parent_approval_id_fkey | parent_approval_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_fk_order_pilot_approvals_created_by_fkey | btree | created_by | não | sim |  | `CREATE INDEX idx_fk_order_pilot_approvals_created_by_fkey ON public.order_pilot_approvals USING btree (created_by)` |
| idx_fk_order_pilot_approvals_parent_approval_id_fkey | btree | parent_approval_id | não | sim |  | `CREATE INDEX idx_fk_order_pilot_approvals_parent_approval_id_fkey ON public.order_pilot_approvals USING btree (parent_approval_id)` |
| idx_pilot_order | btree | order_id | não | sim |  | `CREATE INDEX idx_pilot_order ON public.order_pilot_approvals USING btree (order_id)` |
| idx_pilot_status | btree | status | não | sim |  | `CREATE INDEX idx_pilot_status ON public.order_pilot_approvals USING btree (status)` |
| order_pilot_approvals_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX order_pilot_approvals_pkey ON public.order_pilot_approvals USING btree (id)` |


## Policies (RLS)

### `pilot_delete_admin`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'dev'::app_role))` |
| WITH CHECK |  |

### `pilot_deny_anon`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | anon |
| USING | `false` |
| WITH CHECK | `false` |

### `pilot_insert_owner_admin`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_order_owner_or_admin(order_id)` |

### `pilot_select_owner_admin`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_order_owner_or_admin(order_id)` |
| WITH CHECK |  |

### `pilot_update_owner_admin`

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
| trg_order_pilot_approvals_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
