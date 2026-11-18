# public.sicoob_kit_quote_requests

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
| 3 | `idempotency_key` | `text` | não |  |  |  |
| 4 | `payload_hash` | `text` | não |  |  |  |
| 5 | `quote_id` | `uuid` | não |  |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sicoob_kit_quote_requests_actor_id_idempotency_key_key | UNIQUE | `UNIQUE (actor_id, idempotency_key)` |  |  | sim |
| sicoob_kit_quote_requests_idempotency_key_check | CHECK | `CHECK (length(idempotency_key) >= 8 AND length(idempotency_key) <= 128)` |  |  | sim |
| sicoob_kit_quote_requests_payload_hash_check | CHECK | `CHECK (length(payload_hash) = 64)` |  |  | sim |
| sicoob_kit_quote_requests_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sicoob_kit_quote_requests_quote_id_fkey | FOREIGN KEY | `FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_fk_sicoob_kit_quote_requests_quote_id_fkey | btree | quote_id | não | sim |  | `CREATE INDEX idx_fk_sicoob_kit_quote_requests_quote_id_fkey ON public.sicoob_kit_quote_requests USING btree (quote_id)` |
| sicoob_kit_quote_requests_actor_id_idempotency_key_key | btree | actor_id, idempotency_key | sim | sim |  | `CREATE UNIQUE INDEX sicoob_kit_quote_requests_actor_id_idempotency_key_key ON public.sicoob_kit_quote_requests USING btree (actor_id, idempotency_key)` |
| sicoob_kit_quote_requests_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sicoob_kit_quote_requests_pkey ON public.sicoob_kit_quote_requests USING btree (id)` |


## Policies (RLS)

### `Usuário consulta conversões próprias de kit`

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
