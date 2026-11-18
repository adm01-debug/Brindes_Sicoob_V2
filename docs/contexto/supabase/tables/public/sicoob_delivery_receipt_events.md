# public.sicoob_delivery_receipt_events

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `idempotency_key` | `uuid` | não |  |  |  |
| 3 | `allocation_id` | `uuid` | não |  |  |  |
| 4 | `received_quantity` | `integer` | não | `0` |  |  |
| 5 | `damaged_quantity` | `integer` | não | `0` |  |  |
| 6 | `missing_quantity` | `integer` | não | `0` |  |  |
| 7 | `notes` | `text` | sim |  |  |  |
| 8 | `received_by` | `uuid` | não |  |  |  |
| 9 | `received_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sicoob_delivery_receipt_events_allocation_id_fkey | FOREIGN KEY | `FOREIGN KEY (allocation_id) REFERENCES sicoob_delivery_allocations(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| sicoob_delivery_receipt_events_check | CHECK | `CHECK ((received_quantity + damaged_quantity + missing_quantity) > 0)` |  |  | sim |
| sicoob_delivery_receipt_events_check1 | CHECK | `CHECK ((damaged_quantity + missing_quantity) = 0 OR length(TRIM(BOTH FROM COALESCE(notes, ''::text))) >= 10)` |  |  | sim |
| sicoob_delivery_receipt_events_damaged_quantity_check | CHECK | `CHECK (damaged_quantity >= 0)` |  |  | sim |
| sicoob_delivery_receipt_events_missing_quantity_check | CHECK | `CHECK (missing_quantity >= 0)` |  |  | sim |
| sicoob_delivery_receipt_events_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sicoob_delivery_receipt_events_received_by_fkey | FOREIGN KEY | `FOREIGN KEY (received_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| sicoob_delivery_receipt_events_received_quantity_check | CHECK | `CHECK (received_quantity >= 0)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_delivery_receipts_allocation | btree | allocation_id, received_at | não | sim |  | `CREATE INDEX idx_delivery_receipts_allocation ON public.sicoob_delivery_receipt_events USING btree (allocation_id, received_at)` |
| idx_sicoob_delivery_receipts_received_by | btree | received_by | não | sim |  | `CREATE INDEX idx_sicoob_delivery_receipts_received_by ON public.sicoob_delivery_receipt_events USING btree (received_by)` |
| sicoob_delivery_receipt_events_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sicoob_delivery_receipt_events_pkey ON public.sicoob_delivery_receipt_events USING btree (id)` |
| ux_sicoob_delivery_receipt_idempotency | btree | idempotency_key | sim | sim |  | `CREATE UNIQUE INDEX ux_sicoob_delivery_receipt_idempotency ON public.sicoob_delivery_receipt_events USING btree (idempotency_key)` |


## Policies (RLS)

### `delivery_receipts_read_in_scope`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM (sicoob_delivery_allocations a      JOIN sicoob_delivery_destinations d ON ((d.id = a.destination_id)))   WHERE ((a.id = sicoob_delivery_receipt_events.allocation_id) AND (sicoob_current_actor_can_receive_destination(d.id) OR sicoob_current_actor_can_view_all_consolidation(d.consolidation_id)))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_protect_delivery_receipts | BEFORE | INSERT OR DELETE OR UPDATE | ROW | enabled | public.protect_sicoob_consolidation_records |


## Grants

_nenhum_
