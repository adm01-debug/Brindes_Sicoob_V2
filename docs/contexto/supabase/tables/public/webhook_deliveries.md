# public.webhook_deliveries

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
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
| 6 | `status_code` | `integer` | sim |  |  |  |
| 7 | `response_body_truncated` | `text` | sim |  |  |  |
| 8 | `attempt` | `integer` | não | `1` |  |  |
| 9 | `success` | `boolean` | não | `false` |  |  |
| 10 | `error_message` | `text` | sim |  |  |  |
| 11 | `delivered_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| webhook_deliveries_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| webhook_deliveries_webhook_id_fkey | FOREIGN KEY | `FOREIGN KEY (webhook_id) REFERENCES outbound_webhooks(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_webhook_deliveries_event_time | btree | event, delivered_at | não | sim |  | `CREATE INDEX idx_webhook_deliveries_event_time ON public.webhook_deliveries USING btree (event, delivered_at DESC)` |
| idx_webhook_deliveries_webhook_time | btree | webhook_id, delivered_at | não | sim |  | `CREATE INDEX idx_webhook_deliveries_webhook_time ON public.webhook_deliveries USING btree (webhook_id, delivered_at DESC)` |
| webhook_deliveries_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX webhook_deliveries_pkey ON public.webhook_deliveries USING btree (id)` |


## Policies (RLS)

### `Admins delete webhook_deliveries`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `is_admin(( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |

### `Admins read webhook_deliveries`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `is_admin(( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
