# public.inbound_webhook_events

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
| 2 | `endpoint_id` | `uuid` | não |  |  |  |
| 3 | `event_type` | `text` | sim |  |  |  |
| 4 | `payload` | `jsonb` | sim |  |  |  |
| 5 | `signature_valid` | `boolean` | não | `false` |  |  |
| 6 | `processed` | `boolean` | não | `false` |  |  |
| 7 | `error` | `text` | sim |  |  |  |
| 8 | `source_ip` | `text` | sim |  |  |  |
| 9 | `received_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| inbound_webhook_events_endpoint_id_fkey | FOREIGN KEY | `FOREIGN KEY (endpoint_id) REFERENCES inbound_webhook_endpoints(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| inbound_webhook_events_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_inbound_events_endpoint_time | btree | endpoint_id, received_at | não | sim |  | `CREATE INDEX idx_inbound_events_endpoint_time ON public.inbound_webhook_events USING btree (endpoint_id, received_at DESC)` |
| inbound_webhook_events_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX inbound_webhook_events_pkey ON public.inbound_webhook_events USING btree (id)` |


## Policies (RLS)

### `Admins delete inbound_webhook_events`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `is_admin(( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |

### `Admins read inbound_webhook_events`

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
