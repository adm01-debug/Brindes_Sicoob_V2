# public.webhook_retry_claims

> Reserva durável de tentativas antes do enqueue assíncrono; não representa uma entrega nem participa das métricas de sucesso/falha.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 0 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `webhook_id` | `uuid` | não |  |  |  |
| 3 | `event` | `text` | não |  |  |  |
| 4 | `payload` | `jsonb` | sim |  |  |  |
| 5 | `payload_hash` | `text` | sim |  |  |  |
| 6 | `attempt` | `integer` | não |  |  |  |
| 7 | `claimed_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| webhook_retry_claims_attempt_check | CHECK | `CHECK (attempt > 0)` |  |  | sim |
| webhook_retry_claims_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| webhook_retry_claims_webhook_id_fkey | FOREIGN KEY | `FOREIGN KEY (webhook_id) REFERENCES outbound_webhooks(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| webhook_retry_claims_attempt_unique_idx | btree | webhook_id, event, attempt | sim | sim |  | `CREATE UNIQUE INDEX webhook_retry_claims_attempt_unique_idx ON public.webhook_retry_claims USING btree (webhook_id, event, COALESCE(payload_hash, '<sql-null>'::text), attempt)` |
| webhook_retry_claims_claimed_at_idx | btree | claimed_at | não | sim |  | `CREATE INDEX webhook_retry_claims_claimed_at_idx ON public.webhook_retry_claims USING btree (claimed_at DESC)` |
| webhook_retry_claims_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX webhook_retry_claims_pkey ON public.webhook_retry_claims USING btree (id)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

_nenhum_


## Grants

_nenhum_
