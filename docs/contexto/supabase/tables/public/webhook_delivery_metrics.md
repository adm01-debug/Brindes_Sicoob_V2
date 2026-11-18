# public.webhook_delivery_metrics

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 8 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `occurred_at` | `timestamp with time zone` | não | `now()` |  |  |
| 3 | `request_id` | `text` | não |  |  |  |
| 4 | `direction` | `text` | não |  |  |  |
| 5 | `source` | `text` | não |  |  |  |
| 6 | `event_type` | `text` | sim |  |  |  |
| 7 | `endpoint` | `text` | sim |  |  |  |
| 8 | `http_status` | `integer` | sim |  |  |  |
| 9 | `duration_ms` | `integer` | sim |  |  |  |
| 10 | `attempt` | `integer` | não | `1` |  |  |
| 11 | `success` | `boolean` | não |  |  |  |
| 12 | `error_class` | `text` | sim |  |  |  |
| 13 | `error_message` | `text` | sim |  |  |  |
| 14 | `payload_bytes` | `integer` | sim |  |  |  |
| 15 | `metadata` | `jsonb` | não | `'{}'::jsonb` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| webhook_delivery_metrics_direction_check | CHECK | `CHECK (direction = ANY (ARRAY['inbound'::text, 'outbound'::text]))` |  |  | sim |
| webhook_delivery_metrics_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_webhook_metrics_failures | btree | occurred_at | não | sim | `(success = false)` | `CREATE INDEX idx_webhook_metrics_failures ON public.webhook_delivery_metrics USING btree (occurred_at DESC) WHERE (success = false)` |
| idx_webhook_metrics_occurred_at | btree | occurred_at | não | sim |  | `CREATE INDEX idx_webhook_metrics_occurred_at ON public.webhook_delivery_metrics USING btree (occurred_at DESC)` |
| idx_webhook_metrics_request_id | btree | request_id | não | sim |  | `CREATE INDEX idx_webhook_metrics_request_id ON public.webhook_delivery_metrics USING btree (request_id)` |
| idx_webhook_metrics_source_status | btree | source, http_status, occurred_at | não | sim |  | `CREATE INDEX idx_webhook_metrics_source_status ON public.webhook_delivery_metrics USING btree (source, http_status, occurred_at DESC)` |
| webhook_delivery_metrics_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX webhook_delivery_metrics_pkey ON public.webhook_delivery_metrics USING btree (id)` |


## Policies (RLS)

### `deny anon delete webhook_metrics`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | anon |
| USING | `false` |
| WITH CHECK |  |

### `deny anon insert webhook_metrics`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | anon |
| USING |  |
| WITH CHECK | `false` |

### `deny anon select webhook_metrics`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon |
| USING | `false` |
| WITH CHECK |  |

### `deny anon update webhook_metrics`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | anon |
| USING | `false` |
| WITH CHECK |  |

### `deny auth delete webhook_metrics`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `false` |
| WITH CHECK |  |

### `deny auth insert webhook_metrics`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `false` |

### `deny auth update webhook_metrics`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `false` |
| WITH CHECK |  |

### `supervisors view webhook_metrics`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(( SELECT auth.uid() AS uid), 'dev'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'supervisor'::app_role))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
