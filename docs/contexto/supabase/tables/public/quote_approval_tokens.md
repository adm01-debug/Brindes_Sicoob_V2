# public.quote_approval_tokens

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `quote_id` | `text` | não |  |  |  |
| 3 | `token` | `text` | não | `encode(gen_random_bytes(32), 'hex'::text)` |  |  |
| 4 | `seller_id` | `uuid` | não |  |  |  |
| 5 | `client_name` | `text` | sim |  |  |  |
| 6 | `client_email` | `text` | sim |  |  |  |
| 7 | `status` | `text` | não | `'active'::text` |  |  |
| 8 | `expires_at` | `timestamp with time zone` | sim | `(now() + '30 days'::interval)` |  |  |
| 9 | `viewed_at` | `timestamp with time zone` | sim |  |  |  |
| 10 | `responded_at` | `timestamp with time zone` | sim |  |  |  |
| 11 | `response` | `text` | sim |  |  |  |
| 12 | `response_notes` | `text` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `signer_name` | `text` | sim |  |  |  |
| 16 | `signer_document` | `text` | sim |  |  |  |
| 17 | `signer_ip` | `text` | sim |  |  |  |
| 18 | `signer_user_agent` | `text` | sim |  |  |  |
| 19 | `signature_hash` | `text` | sim |  |  | Novas respostas: HMAC-SHA-256 do payload canônico com chave versionada no Vault; registros anteriores preservam o digest legado. |
| 20 | `signed_at` | `timestamp with time zone` | sim |  |  |  |
| 21 | `signature_data_url` | `text` | sim |  |  |  |
| 22 | `signature_evidence` | `jsonb` | sim |  |  | Payload canônico v1: snapshot comercial completo, decisão, signatário, instante, origem e digest da imagem. |
| 23 | `signature_key_id` | `uuid` | sim |  |  |  |
| 24 | `signature_algorithm` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| quote_approval_signature_evidence_check | CHECK | `CHECK (signature_data_url IS NULL AND signature_evidence IS NULL AND signature_key_id IS NULL AND signature_algorithm IS NULL OR signature_data_url IS NOT NULL AND signature_hash ~ '^[0-9a-f]{64}$'::text AND jsonb_typeof(signature_evidence) = 'object'::text AND signature_key_id IS NOT NULL AND signature_algorithm = 'hmac-sha256-v1'::text)` |  |  | sim |
| quote_approval_tokens_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| quote_approval_tokens_seller_id_fkey | FOREIGN KEY | `FOREIGN KEY (seller_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| quote_approval_tokens_signature_key_id_fkey | FOREIGN KEY | `FOREIGN KEY (signature_key_id) REFERENCES quote_approval_evidence_keys(id)` | NO ACTION | NO ACTION | sim |
| quote_approval_tokens_token_key | UNIQUE | `UNIQUE (token)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_approval_tokens_quote | btree | quote_id | não | sim |  | `CREATE INDEX idx_approval_tokens_quote ON public.quote_approval_tokens USING btree (quote_id)` |
| idx_approval_tokens_token_status | btree | token, status | não | sim | `(status = 'active'::text)` | `CREATE INDEX idx_approval_tokens_token_status ON public.quote_approval_tokens USING btree (token, status) WHERE (status = 'active'::text)` |
| idx_quote_approval_tokens_quote | btree | quote_id, status | não | sim |  | `CREATE INDEX idx_quote_approval_tokens_quote ON public.quote_approval_tokens USING btree (quote_id, status)` |
| idx_quote_approval_tokens_seller_id | btree | seller_id | não | sim |  | `CREATE INDEX idx_quote_approval_tokens_seller_id ON public.quote_approval_tokens USING btree (seller_id)` |
| idx_quote_approval_tokens_signature_key_id | btree | signature_key_id | não | sim |  | `CREATE INDEX idx_quote_approval_tokens_signature_key_id ON public.quote_approval_tokens USING btree (signature_key_id)` |
| quote_approval_tokens_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX quote_approval_tokens_pkey ON public.quote_approval_tokens USING btree (id)` |
| quote_approval_tokens_token_key | btree | token | sim | sim |  | `CREATE UNIQUE INDEX quote_approval_tokens_token_key ON public.quote_approval_tokens USING btree (token)` |


## Policies (RLS)

### `qatokens_delete_scope`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(can_view_all_sales() OR (seller_id = ( SELECT auth.uid() AS uid)))` |
| WITH CHECK |  |

### `qatokens_insert_scope`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(can_view_all_sales() OR (seller_id = ( SELECT auth.uid() AS uid)))` |

### `qatokens_select_scope`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(can_view_all_sales() OR (seller_id = ( SELECT auth.uid() AS uid)))` |
| WITH CHECK |  |

### `qatokens_update_scope`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(can_view_all_sales() OR (seller_id = ( SELECT auth.uid() AS uid)))` |
| WITH CHECK | `(can_view_all_sales() OR (seller_id = ( SELECT auth.uid() AS uid)))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_generate_secure_approval_token | BEFORE | INSERT | ROW | enabled | public.generate_secure_token |
| trg_invalidate_used_approval_token | BEFORE | UPDATE | ROW | enabled | public.invalidate_used_approval_token |
| trg_notify_quote_client_response | AFTER | UPDATE | ROW | enabled | public.notify_quote_client_response |
| trg_owner__quote_approval_tokens__seller_id | BEFORE | INSERT | ROW | enabled | public.enforce_seller_id_owner |
| trg_validate_approval_token_status | BEFORE | INSERT OR UPDATE | ROW | enabled | public.guard_local_quote_approval_token |


## Grants

_nenhum_
