# public.mcp_api_keys

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | sim |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `name` | `text` | não |  |  |  |
| 3 | `key_hash` | `text` | não |  |  |  |
| 4 | `key_prefix` | `text` | não |  |  |  |
| 5 | `scopes` | `text[]` | não | `ARRAY[]::text[]` |  |  |
| 6 | `description` | `text` | sim |  |  |  |
| 7 | `created_by` | `uuid` | não |  |  |  |
| 8 | `last_used_at` | `timestamp with time zone` | sim |  |  |  |
| 9 | `expires_at` | `timestamp with time zone` | sim |  |  |  |
| 10 | `revoked_at` | `timestamp with time zone` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `rotated_from` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| mcp_api_keys_key_hash_format_chk | CHECK | `CHECK (length(key_hash) = 64 AND key_hash ~ '^[0-9a-f]{64}$'::text)` |  |  | sim |
| mcp_api_keys_key_hash_key | UNIQUE | `UNIQUE (key_hash)` |  |  | sim |
| mcp_api_keys_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| mcp_api_keys_rotated_from_fkey | FOREIGN KEY | `FOREIGN KEY (rotated_from) REFERENCES mcp_api_keys(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.mcp_api_keys | mcp_api_keys_rotated_from_fkey | rotated_from | SET NULL |
| public.mcp_key_auto_revocations | mcp_key_auto_revocations_key_id_fkey | key_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_mcp_api_keys_rotated_from | btree | rotated_from | não | sim | `(rotated_from IS NOT NULL)` | `CREATE INDEX idx_mcp_api_keys_rotated_from ON public.mcp_api_keys USING btree (rotated_from) WHERE (rotated_from IS NOT NULL)` |
| mcp_api_keys_key_hash_key | btree | key_hash | sim | sim |  | `CREATE UNIQUE INDEX mcp_api_keys_key_hash_key ON public.mcp_api_keys USING btree (key_hash)` |
| mcp_api_keys_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX mcp_api_keys_pkey ON public.mcp_api_keys USING btree (id)` |


## Policies (RLS)

### `Devs read mcp_api_keys`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_dev(( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |

### `No direct delete via JWT`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `false` |
| WITH CHECK |  |

### `No direct insert via JWT`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `false` |

### `No direct update via JWT`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `false` |
| WITH CHECK | `false` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_audit_mcp_api_keys | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.audit_mcp_api_keys_changes |
| trg_guard_mcp_api_keys | BEFORE | INSERT OR DELETE OR UPDATE | ROW | enabled | public.guard_mcp_api_keys_writes |
| trg_mcp_api_keys_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| trg_owner__mcp_api_keys__created_by | BEFORE | INSERT | ROW | enabled | public.enforce_created_by_owner |


## Grants

_nenhum_
