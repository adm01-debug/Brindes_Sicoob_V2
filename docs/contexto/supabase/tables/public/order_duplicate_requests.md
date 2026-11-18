# public.order_duplicate_requests

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
| 2 | `actor_id` | `uuid` | não |  |  |  |
| 3 | `source_order_id` | `uuid` | não |  |  |  |
| 4 | `idempotency_key` | `uuid` | não |  |  |  |
| 5 | `duplicated_order_id` | `uuid` | não |  |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| order_duplicate_requests_actor_id_fkey | FOREIGN KEY | `FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| order_duplicate_requests_actor_source_key_key | UNIQUE | `UNIQUE (actor_id, source_order_id, idempotency_key)` |  |  | sim |
| order_duplicate_requests_duplicated_order_id_fkey | FOREIGN KEY | `FOREIGN KEY (duplicated_order_id) REFERENCES orders(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| order_duplicate_requests_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| order_duplicate_requests_source_order_id_fkey | FOREIGN KEY | `FOREIGN KEY (source_order_id) REFERENCES orders(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_order_duplicate_requests_duplicated_order | btree | duplicated_order_id | não | sim |  | `CREATE INDEX idx_order_duplicate_requests_duplicated_order ON public.order_duplicate_requests USING btree (duplicated_order_id)` |
| idx_order_duplicate_requests_source_order | btree | source_order_id | não | sim |  | `CREATE INDEX idx_order_duplicate_requests_source_order ON public.order_duplicate_requests USING btree (source_order_id)` |
| order_duplicate_requests_actor_source_key_key | btree | actor_id, source_order_id, idempotency_key | sim | sim |  | `CREATE UNIQUE INDEX order_duplicate_requests_actor_source_key_key ON public.order_duplicate_requests USING btree (actor_id, source_order_id, idempotency_key)` |
| order_duplicate_requests_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX order_duplicate_requests_pkey ON public.order_duplicate_requests USING btree (id)` |


## Policies (RLS)

### `deny_non_service_role`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | RESTRICTIVE |
| roles | public |
| USING | `false` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
