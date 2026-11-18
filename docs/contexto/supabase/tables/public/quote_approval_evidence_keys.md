# public.quote_approval_evidence_keys

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
| 2 | `vault_secret_name` | `text` | não |  |  |  |
| 3 | `is_active` | `boolean` | não | `false` |  |  |
| 4 | `activated_at` | `timestamp with time zone` | não | `clock_timestamp()` |  |  |
| 5 | `retired_at` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| quote_approval_evidence_key_lifecycle | CHECK | `CHECK (is_active AND retired_at IS NULL OR NOT is_active AND retired_at IS NOT NULL)` |  |  | sim |
| quote_approval_evidence_keys_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| quote_approval_evidence_keys_vault_secret_name_key | UNIQUE | `UNIQUE (vault_secret_name)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.quote_approval_tokens | quote_approval_tokens_signature_key_id_fkey | signature_key_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| quote_approval_evidence_keys_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX quote_approval_evidence_keys_pkey ON public.quote_approval_evidence_keys USING btree (id)` |
| quote_approval_evidence_keys_vault_secret_name_key | btree | vault_secret_name | sim | sim |  | `CREATE UNIQUE INDEX quote_approval_evidence_keys_vault_secret_name_key ON public.quote_approval_evidence_keys USING btree (vault_secret_name)` |
| quote_approval_evidence_one_active_key | btree | is_active | sim | sim | `is_active` | `CREATE UNIQUE INDEX quote_approval_evidence_one_active_key ON public.quote_approval_evidence_keys USING btree (is_active) WHERE is_active` |


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
