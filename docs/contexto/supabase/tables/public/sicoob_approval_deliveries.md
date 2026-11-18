# public.sicoob_approval_deliveries

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
| 2 | `request_id` | `uuid` | não |  |  |  |
| 3 | `setting_id` | `uuid` | sim |  |  |  |
| 4 | `channel` | `text` | não |  |  |  |
| 5 | `destination` | `text` | não |  |  |  |
| 6 | `payload` | `jsonb` | não |  |  |  |
| 7 | `state` | `text` | não | `'pending'::text` |  |  |
| 8 | `attempts` | `integer` | não | `0` |  |  |
| 9 | `available_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `lease_token` | `uuid` | sim |  |  |  |
| 11 | `lease_expires_at` | `timestamp with time zone` | sim |  |  |  |
| 12 | `last_error_code` | `text` | sim |  |  |  |
| 13 | `provider_id` | `text` | sim |  |  |  |
| 14 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 16 | `delivered_at` | `timestamp with time zone` | sim |  |  |  |
| 17 | `event_kind` | `text` | não | `'request_created'::text` |  |  |
| 18 | `generation` | `integer` | não | `1` |  |  |
| 19 | `supersedes_delivery_id` | `uuid` | sim |  |  |  |
| 20 | `reconciliation` | `jsonb` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sicoob_approval_deliveries_attempts_check | CHECK | `CHECK (attempts >= 0 AND attempts <= 5)` |  |  | sim |
| sicoob_approval_deliveries_channel_check | CHECK | `CHECK (channel = ANY (ARRAY['slack'::text, 'email'::text]))` |  |  | sim |
| sicoob_approval_deliveries_event_generation_key | UNIQUE | `UNIQUE (request_id, event_kind, channel, generation)` |  |  | sim |
| sicoob_approval_deliveries_event_kind_check | CHECK | `CHECK (event_kind = ANY (ARRAY['request_created'::text, 'escalated_to_board'::text]))` |  |  | sim |
| sicoob_approval_deliveries_generation_check | CHECK | `CHECK (generation > 0)` |  |  | sim |
| sicoob_approval_deliveries_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sicoob_approval_deliveries_request_id_fkey | FOREIGN KEY | `FOREIGN KEY (request_id) REFERENCES sicoob_approval_requests(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| sicoob_approval_deliveries_result_receipt_check | CHECK | `CHECK ((state <> 'delivered'::text OR provider_id IS NOT NULL AND btrim(provider_id) <> ''::text) AND ((state <> ALL (ARRAY['retry'::text, 'uncertain'::text, 'failed'::text])) OR last_error_code IS NOT NULL AND btrim(last_error_code) <> ''::text))` |  |  | sim |
| sicoob_approval_deliveries_setting_id_fkey | FOREIGN KEY | `FOREIGN KEY (setting_id) REFERENCES pa_notification_settings(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| sicoob_approval_deliveries_state_check | CHECK | `CHECK (state = ANY (ARRAY['pending'::text, 'sending'::text, 'delivered'::text, 'retry'::text, 'uncertain'::text, 'failed'::text, 'cancelled'::text]))` |  |  | sim |
| sicoob_approval_deliveries_supersedes_delivery_id_fkey | FOREIGN KEY | `FOREIGN KEY (supersedes_delivery_id) REFERENCES sicoob_approval_deliveries(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.sicoob_approval_deliveries | sicoob_approval_deliveries_supersedes_delivery_id_fkey | supersedes_delivery_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sicoob_approval_deliveries_supersedes_delivery | btree | supersedes_delivery_id | não | sim |  | `CREATE INDEX idx_sicoob_approval_deliveries_supersedes_delivery ON public.sicoob_approval_deliveries USING btree (supersedes_delivery_id)` |
| idx_sicoob_approval_delivery_expired_lease | btree | lease_expires_at | não | sim | `(state = 'sending'::text)` | `CREATE INDEX idx_sicoob_approval_delivery_expired_lease ON public.sicoob_approval_deliveries USING btree (lease_expires_at) WHERE (state = 'sending'::text)` |
| idx_sicoob_approval_delivery_pending | btree | available_at, id | não | sim | `(state = ANY (ARRAY['pending'::text, 'retry'::text]))` | `CREATE INDEX idx_sicoob_approval_delivery_pending ON public.sicoob_approval_deliveries USING btree (available_at, id) WHERE (state = ANY (ARRAY['pending'::text, 'retry'::text]))` |
| idx_sicoob_approval_delivery_request_event | btree | request_id, event_kind, channel, generation | não | sim |  | `CREATE INDEX idx_sicoob_approval_delivery_request_event ON public.sicoob_approval_deliveries USING btree (request_id, event_kind, channel, generation DESC)` |
| idx_sicoob_approval_delivery_setting | btree | setting_id | não | sim |  | `CREATE INDEX idx_sicoob_approval_delivery_setting ON public.sicoob_approval_deliveries USING btree (setting_id)` |
| sicoob_approval_deliveries_event_generation_key | btree | request_id, event_kind, channel, generation | sim | sim |  | `CREATE UNIQUE INDEX sicoob_approval_deliveries_event_generation_key ON public.sicoob_approval_deliveries USING btree (request_id, event_kind, channel, generation)` |
| sicoob_approval_deliveries_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sicoob_approval_deliveries_pkey ON public.sicoob_approval_deliveries USING btree (id)` |


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
