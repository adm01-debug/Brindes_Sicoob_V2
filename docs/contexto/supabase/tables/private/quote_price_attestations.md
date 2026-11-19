# private.quote_price_attestations

> Atestados transitórios e privados de preços validados pela Edge contra o catálogo autoritativo.

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
| 2 | `actor_id` | `uuid` | não |  |  |  |
| 3 | `quote_id` | `uuid` | sim |  |  |  |
| 4 | `expected_row_version` | `integer` | sim |  |  |  |
| 5 | `payload_hash` | `text` | não |  |  |  |
| 6 | `expires_at` | `timestamp with time zone` | não |  |  |  |
| 7 | `consumed_at` | `timestamp with time zone` | sim |  |  |  |
| 8 | `consumed_transaction_id` | `xid8` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `clock_timestamp()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| quote_price_attestations_consumption_check | CHECK | `CHECK (consumed_at IS NULL AND consumed_transaction_id IS NULL OR consumed_at IS NOT NULL AND consumed_transaction_id IS NOT NULL)` |  |  | sim |
| quote_price_attestations_payload_hash_check | CHECK | `CHECK (length(payload_hash) = 64)` |  |  | sim |
| quote_price_attestations_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| quote_price_attestations_version_check | CHECK | `CHECK (quote_id IS NULL AND expected_row_version IS NULL OR quote_id IS NOT NULL AND expected_row_version > 0)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| quote_price_attestations_expiration_idx | btree | expires_at | não | sim |  | `CREATE INDEX quote_price_attestations_expiration_idx ON private.quote_price_attestations USING btree (expires_at)` |
| quote_price_attestations_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX quote_price_attestations_pkey ON private.quote_price_attestations USING btree (id)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

_nenhum_


## Grants

_nenhum_
