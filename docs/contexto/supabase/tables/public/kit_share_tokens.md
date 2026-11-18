# public.kit_share_tokens

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
| 2 | `kit_id` | `uuid` | não |  |  |  |
| 3 | `seller_id` | `uuid` | não |  |  |  |
| 4 | `token` | `text` | não | `encode(gen_random_bytes(32), 'hex'::text)` |  |  |
| 5 | `client_name` | `text` | sim |  |  |  |
| 6 | `client_email` | `text` | sim |  |  |  |
| 7 | `status` | `text` | não | `'active'::text` |  |  |
| 8 | `expires_at` | `timestamp with time zone` | sim | `(now() + '30 days'::interval)` |  |  |
| 9 | `viewed_at` | `timestamp with time zone` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| kit_share_tokens_kit_id_fkey | FOREIGN KEY | `FOREIGN KEY (kit_id) REFERENCES custom_kits(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| kit_share_tokens_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| kit_share_tokens_token_key | UNIQUE | `UNIQUE (token)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_kit_share_tokens_kit_id | btree | kit_id | não | sim |  | `CREATE INDEX idx_kit_share_tokens_kit_id ON public.kit_share_tokens USING btree (kit_id)` |
| kit_share_tokens_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX kit_share_tokens_pkey ON public.kit_share_tokens USING btree (id)` |
| kit_share_tokens_token_key | btree | token | sim | sim |  | `CREATE UNIQUE INDEX kit_share_tokens_token_key ON public.kit_share_tokens USING btree (token)` |


## Policies (RLS)

### `Sellers can manage own kit share tokens`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(seller_id = ( SELECT auth.uid() AS uid))` |
| WITH CHECK | `(seller_id = ( SELECT auth.uid() AS uid))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_dispatch_webhook_kit_share | AFTER | INSERT | ROW | enabled | public.dispatch_quote_webhook_event |
| trg_owner__kit_share_tokens__seller_id | BEFORE | INSERT | ROW | enabled | public.enforce_seller_id_owner |
| trg_validate_kit_share_token_status | BEFORE | INSERT OR UPDATE | ROW | enabled | public.validate_status_fields |


## Grants

_nenhum_
