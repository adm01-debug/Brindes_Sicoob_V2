# public.order_audit_events

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
| 3 | `event_type` | `text` | não |  |  |  |
| 4 | `event_category` | `text` | não |  |  |  |
| 5 | `actor_id` | `uuid` | sim |  |  |  |
| 6 | `actor_name` | `text` | sim |  |  |  |
| 7 | `actor_role` | `text` | sim |  |  |  |
| 8 | `description` | `text` | não |  |  |  |
| 9 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 10 | `occurred_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `created_by_name` | `text` | sim |  |  |  |
| 12 | `category` | `text` | sim | `'status_change'::text` |  |  |
| 13 | `observations` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| order_audit_events_actor_id_fkey | FOREIGN KEY | `FOREIGN KEY (actor_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| order_audit_events_event_category_check | CHECK | `CHECK (event_category = ANY (ARRAY['status'::text, 'logistics'::text, 'invoice'::text, 'payment'::text, 'pilot'::text, 'comment'::text, 'system'::text]))` |  |  | sim |
| order_audit_events_order_id_fkey | FOREIGN KEY | `FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| order_audit_events_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_audit_category | btree | event_category | não | sim |  | `CREATE INDEX idx_audit_category ON public.order_audit_events USING btree (event_category)` |
| idx_audit_order | btree | order_id, occurred_at | não | sim |  | `CREATE INDEX idx_audit_order ON public.order_audit_events USING btree (order_id, occurred_at DESC)` |
| idx_fk_order_audit_events_actor_id_fkey | btree | actor_id | não | sim |  | `CREATE INDEX idx_fk_order_audit_events_actor_id_fkey ON public.order_audit_events USING btree (actor_id)` |
| order_audit_events_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX order_audit_events_pkey ON public.order_audit_events USING btree (id)` |


## Policies (RLS)

### `sicoob_merged_00d193d0f834efa9_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `((true AND (( SELECT auth.role() AS role) = 'authenticated'::text)) OR (pg_has_role(CURRENT_USER, 'anon'::name, 'member'::text) AND false) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND false))` |

### `sicoob_merged_9f0bc331e2bbf107_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(pg_has_role(CURRENT_USER, 'anon'::name, 'member'::text) AND false)` |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'anon'::name, 'member'::text) AND false)` |

### `sicoob_merged_a99461f64cbf16e1_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'anon'::name, 'member'::text) AND false) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'dev'::app_role) OR (EXISTS ( SELECT 1    FROM orders o   WHERE ((o.id = order_audit_events.order_id) AND ((o.seller_id = ( SELECT auth.uid() AS uid)) OR (o.organization_id IN ( SELECT get_user_org_ids(( SELECT auth.uid() AS uid)) AS get_user_org_ids)))))) OR (EXISTS ( SELECT 1    FROM (sicoob_orders so      LEFT JOIN profiles p ON ((p.id = ( SELECT auth.uid() AS uid))))   WHERE ((so.id = order_audit_events.order_id) AND ((so.created_by = ( SELECT auth.uid() AS uid)) OR ((p.role = 'gestor_pa'::text) AND (so.pa_id = p.pa_id)) OR ((p.role = 'gestor_singular'::text) AND (so.cooperative_id = p.cooperativa_id)) OR (p.role = ANY (ARRAY['supervisor'::text, 'logistics'::text])))))))))` |
| WITH CHECK |  |

### `sicoob_merged_f28bcf4cec02c05a_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((true AND false) OR (pg_has_role(CURRENT_USER, 'anon'::name, 'member'::text) AND false))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
