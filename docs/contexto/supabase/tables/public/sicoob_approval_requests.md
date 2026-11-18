# public.sicoob_approval_requests

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `order_id` | `uuid` | não |  |  |  |
| 3 | `requester_id` | `uuid` | não |  |  |  |
| 4 | `approver_id` | `uuid` | sim |  |  |  |
| 5 | `status` | `text` | não | `'pending'::text` |  |  |
| 6 | `request_reason` | `text` | sim |  |  |  |
| 7 | `rejection_reason` | `text` | sim |  |  |  |
| 8 | `amount_at_request` | `numeric(15,2)` | não |  |  |  |
| 9 | `threshold_at_request` | `numeric(15,2)` | não |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 13 | `approval_delegation_id` | `uuid` | sim |  |  |  |
| 14 | `authority_delegator_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| check_positive_amount | CHECK | `CHECK (amount_at_request >= 0::numeric)` |  |  | sim |
| check_positive_threshold | CHECK | `CHECK (threshold_at_request >= 0::numeric)` |  |  | sim |
| sicoob_approval_requests_approval_delegation_id_fkey | FOREIGN KEY | `FOREIGN KEY (approval_delegation_id) REFERENCES sicoob_approval_delegations(id)` | NO ACTION | NO ACTION | sim |
| sicoob_approval_requests_approver_id_fkey | FOREIGN KEY | `FOREIGN KEY (approver_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| sicoob_approval_requests_authority_delegator_id_fkey | FOREIGN KEY | `FOREIGN KEY (authority_delegator_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| sicoob_approval_requests_order_id_fkey | FOREIGN KEY | `FOREIGN KEY (order_id) REFERENCES sicoob_orders(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| sicoob_approval_requests_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sicoob_approval_requests_requester_id_fkey | FOREIGN KEY | `FOREIGN KEY (requester_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| sicoob_approval_requests_status_check | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.sicoob_approval_deliveries | sicoob_approval_deliveries_request_id_fkey | request_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_fk_sicoob_approval_requests_approver_id_fkey | btree | approver_id | não | sim |  | `CREATE INDEX idx_fk_sicoob_approval_requests_approver_id_fkey ON public.sicoob_approval_requests USING btree (approver_id)` |
| idx_fk_sicoob_approval_requests_requester_id_fkey | btree | requester_id | não | sim |  | `CREATE INDEX idx_fk_sicoob_approval_requests_requester_id_fkey ON public.sicoob_approval_requests USING btree (requester_id)` |
| idx_sicoob_approval_requests_delegation | btree | approval_delegation_id | não | sim |  | `CREATE INDEX idx_sicoob_approval_requests_delegation ON public.sicoob_approval_requests USING btree (approval_delegation_id)` |
| idx_sicoob_approval_requests_delegator | btree | authority_delegator_id | não | sim |  | `CREATE INDEX idx_sicoob_approval_requests_delegator ON public.sicoob_approval_requests USING btree (authority_delegator_id)` |
| sicoob_approval_requests_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sicoob_approval_requests_pkey ON public.sicoob_approval_requests USING btree (id)` |
| ux_sicoob_approval_one_pending_per_order | btree | order_id | sim | sim | `(status = 'pending'::text)` | `CREATE UNIQUE INDEX ux_sicoob_approval_one_pending_per_order ON public.sicoob_approval_requests USING btree (order_id) WHERE (status = 'pending'::text)` |


## Policies (RLS)

### `Users can create approval requests`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(( SELECT auth.uid() AS uid) = requester_id)` |

### `sicoob_approval_requests_read_scoped`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((requester_id = ( SELECT auth.uid() AS uid)) OR (approver_id = ( SELECT auth.uid() AS uid)) OR sicoob_current_actor_can_read_order(order_id))` |
| WITH CHECK |  |

### `sicoob_approval_requests_update_scoped`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((requester_id = ( SELECT auth.uid() AS uid)) OR sicoob_current_actor_can_approve_order(order_id, false))` |
| WITH CHECK | `((requester_id = ( SELECT auth.uid() AS uid)) OR sicoob_current_actor_can_approve_order(order_id, false))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_guard_sicoob_approval_request_insert | BEFORE | INSERT | ROW | enabled | public.guard_sicoob_approval_request_insert |
| tr_protect_sicoob_approval_request | BEFORE | UPDATE | ROW | enabled | public.protect_sicoob_approval_request |
| tr_queue_sicoob_approval_escalation | AFTER | UPDATE | ROW | enabled | public.queue_sicoob_approval_escalation |
| tr_queue_sicoob_approval_notifications | AFTER | INSERT | ROW | enabled | public.queue_sicoob_approval_notifications |
| update_sicoob_approval_requests_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
