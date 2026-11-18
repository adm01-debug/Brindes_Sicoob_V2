# public.sicoob_quote_reorder_requests

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
| 3 | `source_quote_id` | `uuid` | não |  |  |  |
| 4 | `idempotency_key` | `text` | não |  |  |  |
| 5 | `payload_hash` | `text` | não |  |  |  |
| 6 | `quote_id` | `uuid` | não |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sicoob_quote_reorder_requests_actor_id_source_quote_id_idem_key | UNIQUE | `UNIQUE (actor_id, source_quote_id, idempotency_key)` |  |  | sim |
| sicoob_quote_reorder_requests_idempotency_key_check | CHECK | `CHECK (length(idempotency_key) >= 8 AND length(idempotency_key) <= 128)` |  |  | sim |
| sicoob_quote_reorder_requests_payload_hash_check | CHECK | `CHECK (payload_hash ~ '^[0-9a-f]{64}$'::text)` |  |  | sim |
| sicoob_quote_reorder_requests_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sicoob_quote_reorder_requests_quote_id_fkey | FOREIGN KEY | `FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| sicoob_quote_reorder_requests_source_quote_id_fkey | FOREIGN KEY | `FOREIGN KEY (source_quote_id) REFERENCES quotes(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sicoob_quote_reorder_requests_source | btree | source_quote_id, created_at | não | sim |  | `CREATE INDEX idx_sicoob_quote_reorder_requests_source ON public.sicoob_quote_reorder_requests USING btree (source_quote_id, created_at DESC)` |
| idx_sicoob_reorder_requests_quote_id | btree | quote_id | não | sim |  | `CREATE INDEX idx_sicoob_reorder_requests_quote_id ON public.sicoob_quote_reorder_requests USING btree (quote_id)` |
| sicoob_quote_reorder_requests_actor_id_source_quote_id_idem_key | btree | actor_id, source_quote_id, idempotency_key | sim | sim |  | `CREATE UNIQUE INDEX sicoob_quote_reorder_requests_actor_id_source_quote_id_idem_key ON public.sicoob_quote_reorder_requests USING btree (actor_id, source_quote_id, idempotency_key)` |
| sicoob_quote_reorder_requests_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sicoob_quote_reorder_requests_pkey ON public.sicoob_quote_reorder_requests USING btree (id)` |


## Policies (RLS)

### `Usuário consulta as próprias recompras de orçamento Sicoob`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(actor_id = ( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
