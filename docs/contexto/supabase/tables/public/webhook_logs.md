# public.webhook_logs

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
| 2 | `webhook_id` | `uuid` | sim |  |  |  |
| 3 | `event_type` | `text` | não |  |  |  |
| 4 | `payload` | `jsonb` | não |  |  |  |
| 5 | `status_code` | `integer` | sim |  |  |  |
| 6 | `response_body` | `text` | sim |  |  |  |
| 7 | `success` | `boolean` | sim |  |  |  |
| 8 | `attempt_number` | `integer` | sim | `1` |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| webhook_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| webhook_logs_webhook_id_fkey | FOREIGN KEY | `FOREIGN KEY (webhook_id) REFERENCES webhook_configs(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_webhook_logs_webhook | btree | webhook_id, created_at | não | sim |  | `CREATE INDEX idx_webhook_logs_webhook ON public.webhook_logs USING btree (webhook_id, created_at DESC)` |
| webhook_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX webhook_logs_pkey ON public.webhook_logs USING btree (id)` |


## Policies (RLS)

### `admin_read_webhook_logs`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM user_roles ur   WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND ((ur.role)::text = ANY (ARRAY['admin'::text, 'dev'::text])))))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
