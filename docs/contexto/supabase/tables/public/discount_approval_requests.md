# public.discount_approval_requests

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | sim |
| replica identity | full |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `quote_id` | `uuid` | não |  |  |  |
| 3 | `seller_id` | `uuid` | não |  |  |  |
| 4 | `requested_discount_percent` | `numeric` | não |  |  |  |
| 5 | `max_allowed_percent` | `numeric` | não |  |  |  |
| 6 | `status` | `text` | não | `'pending'::text` |  |  |
| 7 | `admin_id` | `uuid` | sim |  |  |  |
| 8 | `admin_notes` | `text` | sim |  |  |  |
| 9 | `seller_notes` | `text` | sim |  |  |  |
| 10 | `responded_at` | `timestamp with time zone` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `requested_quote_row_version` | `integer` | sim |  |  |  |
| 14 | `requested_real_discount_percent` | `numeric` | sim |  |  |  |
| 15 | `approved_quote_row_version` | `integer` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| discount_approval_max_percent_range | CHECK | `CHECK (max_allowed_percent >= 0::numeric AND max_allowed_percent <= 100::numeric)` |  |  | sim |
| discount_approval_requested_percent_range | CHECK | `CHECK (requested_discount_percent >= 0::numeric AND requested_discount_percent <= 100::numeric)` |  |  | sim |
| discount_approval_requests_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| discount_approval_requests_quote_id_fkey | FOREIGN KEY | `FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| discount_approval_one_pending_per_quote_idx | btree | quote_id | sim | sim | `(status = 'pending'::text)` | `CREATE UNIQUE INDEX discount_approval_one_pending_per_quote_idx ON public.discount_approval_requests USING btree (quote_id) WHERE (status = 'pending'::text)` |
| discount_approval_requests_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX discount_approval_requests_pkey ON public.discount_approval_requests USING btree (id)` |
| idx_dar_seller_created_at | btree | seller_id, created_at | não | sim |  | `CREATE INDEX idx_dar_seller_created_at ON public.discount_approval_requests USING btree (seller_id, created_at DESC)` |
| idx_dar_seller_status_created_at | btree | seller_id, status, created_at | não | sim |  | `CREATE INDEX idx_dar_seller_status_created_at ON public.discount_approval_requests USING btree (seller_id, status, created_at DESC)` |
| idx_discount_approval_requests_quote_id | btree | quote_id | não | sim |  | `CREATE INDEX idx_discount_approval_requests_quote_id ON public.discount_approval_requests USING btree (quote_id)` |
| idx_discount_approval_requests_seller_id | btree | seller_id | não | sim |  | `CREATE INDEX idx_discount_approval_requests_seller_id ON public.discount_approval_requests USING btree (seller_id)` |
| idx_discount_approval_requests_status | btree | status | não | sim |  | `CREATE INDEX idx_discount_approval_requests_status ON public.discount_approval_requests USING btree (status)` |


## Policies (RLS)

### `dar_select_scope`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((seller_id = ( SELECT auth.uid() AS uid)) OR can_manage_quote_scope(( SELECT auth.uid() AS uid), quote_id))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| notify_discount_approval_trigger | AFTER | INSERT OR UPDATE | ROW | enabled | public.notify_discount_approval_request |
| trg_dispatch_webhook_discount | AFTER | INSERT OR UPDATE | ROW | enabled | public.dispatch_quote_webhook_event |
| trg_owner__discount_approval_requests__seller_id | BEFORE | INSERT | ROW | enabled | public.enforce_seller_id_owner |
| update_discount_approval_requests_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| validate_discount_approval_status_trigger | BEFORE | INSERT OR UPDATE | ROW | enabled | public.validate_discount_approval_status |


## Grants

_nenhum_
