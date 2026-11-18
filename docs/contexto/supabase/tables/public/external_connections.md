# public.external_connections

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
| 2 | `type` | `text` | não |  |  |  |
| 3 | `name` | `text` | não |  |  |  |
| 4 | `config` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 5 | `secret_refs` | `text[]` | não | `ARRAY[]::text[]` |  |  |
| 6 | `status` | `text` | não | `'unconfigured'::text` |  |  |
| 7 | `last_test_at` | `timestamp with time zone` | sim |  |  |  |
| 8 | `last_test_ok` | `boolean` | sim |  |  |  |
| 9 | `last_test_message` | `text` | sim |  |  |  |
| 10 | `created_by` | `uuid` | não |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `last_latency_ms` | `integer` | sim |  |  |  |
| 14 | `env_key` | `text` | sim |  |  |  |
| 15 | `auto_test_enabled` | `boolean` | não | `true` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| external_connections_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| external_connections_status_check | CHECK | `CHECK (status = ANY (ARRAY['unconfigured'::text, 'active'::text, 'degraded'::text, 'error'::text, 'disabled'::text]))` |  |  | sim |
| external_connections_type_check | CHECK | `CHECK (type = ANY (ARRAY['supabase'::text, 'bitrix24'::text, 'n8n'::text, 'mcp'::text, 'webhook_outbound'::text, 'webhook_inbound'::text]))` |  |  | sim |
| external_connections_type_name_key | UNIQUE | `UNIQUE (type, name)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.connection_test_history | connection_test_history_connection_id_fkey | connection_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| external_connections_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX external_connections_pkey ON public.external_connections USING btree (id)` |
| external_connections_type_name_key | btree | type, name | sim | sim |  | `CREATE UNIQUE INDEX external_connections_type_name_key ON public.external_connections USING btree (type, name)` |
| external_connections_type_name_no_env_uidx | btree | type, name | sim | sim | `(env_key IS NULL)` | `CREATE UNIQUE INDEX external_connections_type_name_no_env_uidx ON public.external_connections USING btree (type, name) WHERE (env_key IS NULL)` |
| idx_external_connections_auto_test_enabled | btree | auto_test_enabled | não | sim | `(auto_test_enabled = true)` | `CREATE INDEX idx_external_connections_auto_test_enabled ON public.external_connections USING btree (auto_test_enabled) WHERE (auto_test_enabled = true)` |
| idx_external_connections_envkey_type | btree | env_key, type | sim | sim | `(env_key IS NOT NULL)` | `CREATE UNIQUE INDEX idx_external_connections_envkey_type ON public.external_connections USING btree (env_key, type) WHERE (env_key IS NOT NULL)` |
| idx_external_connections_type | btree | type | não | sim |  | `CREATE INDEX idx_external_connections_type ON public.external_connections USING btree (type)` |


## Policies (RLS)

### `Devs manage external_connections`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_dev(( SELECT auth.uid() AS uid))` |
| WITH CHECK | `is_dev(( SELECT auth.uid() AS uid))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_external_connections_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| trg_owner__external_connections__created_by | BEFORE | INSERT | ROW | enabled | public.enforce_created_by_owner |


## Grants

_nenhum_
