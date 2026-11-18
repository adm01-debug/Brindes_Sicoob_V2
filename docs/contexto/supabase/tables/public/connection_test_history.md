# public.connection_test_history

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `connection_id` | `uuid` | não |  |  |  |
| 3 | `tested_at` | `timestamp with time zone` | não | `now()` |  |  |
| 4 | `success` | `boolean` | não | `false` |  |  |
| 5 | `latency_ms` | `integer` | sim |  |  |  |
| 6 | `status_code` | `integer` | sim |  |  |  |
| 7 | `error_message` | `text` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `triggered_by` | `text` | não | `'manual'::text` |  |  |
| 10 | `error_kind` | `text` | sim |  |  |  |
| 11 | `request_method` | `text` | sim |  |  |  |
| 12 | `request_url` | `text` | sim |  |  |  |
| 13 | `response_headers` | `jsonb` | sim |  |  |  |
| 14 | `response_body` | `text` | sim |  |  |  |
| 15 | `dns_ms` | `integer` | sim |  |  |  |
| 16 | `tcp_ms` | `integer` | sim |  |  |  |
| 17 | `tls_ms` | `integer` | sim |  |  |  |
| 18 | `ttfb_ms` | `integer` | sim |  |  |  |
| 19 | `download_ms` | `integer` | sim |  |  |  |
| 20 | `triggered_by_user_id` | `uuid` | sim |  |  |  |
| 21 | `attempts` | `smallint` | não | `1` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| connection_test_history_connection_id_fkey | FOREIGN KEY | `FOREIGN KEY (connection_id) REFERENCES external_connections(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| connection_test_history_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| connection_test_history_triggered_by_check | CHECK | `CHECK (triggered_by = ANY (ARRAY['manual'::text, 'cron'::text, 'webhook'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| connection_test_history_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX connection_test_history_pkey ON public.connection_test_history USING btree (id)` |
| idx_connection_test_history_conn_time | btree | connection_id, tested_at | não | sim |  | `CREATE INDEX idx_connection_test_history_conn_time ON public.connection_test_history USING btree (connection_id, tested_at DESC)` |
| idx_cth_triggered_by | btree | triggered_by | não | sim |  | `CREATE INDEX idx_cth_triggered_by ON public.connection_test_history USING btree (triggered_by)` |


## Policies (RLS)

### `Devs delete connection_test_history`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_dev(( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |

### `Devs read connection_test_history`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_dev(( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |

### `Service role inserts connection_test_history`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | service_role |
| USING |  |
| WITH CHECK | `true` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_trim_connection_test_history | AFTER | INSERT | ROW | enabled | public.trim_connection_test_history |


## Grants

_nenhum_
