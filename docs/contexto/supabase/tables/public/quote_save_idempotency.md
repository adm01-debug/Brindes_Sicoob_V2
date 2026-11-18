# public.quote_save_idempotency

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
| 1 | `actor_id` | `uuid` | não |  |  |  |
| 2 | `idempotency_key` | `uuid` | não |  |  |  |
| 3 | `payload_hash` | `text` | não |  |  |  |
| 4 | `quote_id` | `uuid` | não |  |  |  |
| 5 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| quote_save_idempotency_actor_id_fkey | FOREIGN KEY | `FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| quote_save_idempotency_payload_hash_check | CHECK | `CHECK (length(payload_hash) = ANY (ARRAY[32, 64]))` |  |  | sim |
| quote_save_idempotency_pkey | PRIMARY KEY | `PRIMARY KEY (actor_id, idempotency_key)` |  |  | sim |
| quote_save_idempotency_quote_id_fkey | FOREIGN KEY | `FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_quote_save_idempotency_quote_id | btree | quote_id | não | sim |  | `CREATE INDEX idx_quote_save_idempotency_quote_id ON public.quote_save_idempotency USING btree (quote_id)` |
| quote_save_idempotency_pkey | btree | actor_id, idempotency_key | sim | sim |  | `CREATE UNIQUE INDEX quote_save_idempotency_pkey ON public.quote_save_idempotency USING btree (actor_id, idempotency_key)` |


## Policies (RLS)

### `quote_save_idempotency_insert_own`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((( SELECT auth.uid() AS uid) = actor_id) AND (EXISTS ( SELECT 1    FROM quotes q   WHERE ((q.id = quote_save_idempotency.quote_id) AND (q.seller_id = ( SELECT auth.uid() AS uid))))))` |

### `quote_save_idempotency_select_own`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(( SELECT auth.uid() AS uid) = actor_id)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
