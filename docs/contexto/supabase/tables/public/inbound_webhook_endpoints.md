# public.inbound_webhook_endpoints

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
| 2 | `slug` | `text` | não |  |  |  |
| 3 | `name` | `text` | não |  |  |  |
| 4 | `source_system` | `text` | não |  |  |  |
| 5 | `hmac_secret_ref` | `text` | não |  |  |  |
| 6 | `allowed_events` | `text[]` | não | `ARRAY[]::text[]` |  |  |
| 7 | `active` | `boolean` | não | `true` |  |  |
| 8 | `description` | `text` | sim |  |  |  |
| 9 | `created_by` | `uuid` | não |  |  |  |
| 10 | `last_received_at` | `timestamp with time zone` | sim |  |  |  |
| 11 | `total_received` | `integer` | não | `0` |  |  |
| 12 | `total_invalid` | `integer` | não | `0` |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| inbound_webhook_endpoints_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| inbound_webhook_endpoints_slug_key | UNIQUE | `UNIQUE (slug)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.inbound_webhook_events | inbound_webhook_events_endpoint_id_fkey | endpoint_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| inbound_webhook_endpoints_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX inbound_webhook_endpoints_pkey ON public.inbound_webhook_endpoints USING btree (id)` |
| inbound_webhook_endpoints_slug_key | btree | slug | sim | sim |  | `CREATE UNIQUE INDEX inbound_webhook_endpoints_slug_key ON public.inbound_webhook_endpoints USING btree (slug)` |


## Policies (RLS)

### `Admins manage inbound_webhook_endpoints`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `is_admin(( SELECT auth.uid() AS uid))` |
| WITH CHECK | `is_admin(( SELECT auth.uid() AS uid))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_inbound_endpoints_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| trg_owner__inbound_webhook_endpoints__created_by | BEFORE | INSERT | ROW | enabled | public.enforce_created_by_owner |


## Grants

_nenhum_
