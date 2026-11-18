# public.notification_digests

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
| 2 | `user_id` | `uuid` | sim |  |  |  |
| 3 | `subject` | `text` | sim |  |  |  |
| 4 | `content_data` | `jsonb` | não |  |  |  |
| 5 | `status` | `text` | sim | `'pending'::text` |  |  |
| 6 | `scheduled_for` | `timestamp with time zone` | não |  |  |  |
| 7 | `sent_at` | `timestamp with time zone` | sim |  |  |  |
| 8 | `error_log` | `text` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| notification_digests_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| notification_digests_status_check | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'sent'::text, 'failed'::text]))` |  |  | sim |
| notification_digests_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_digests_user_status | btree | user_id, status | não | sim |  | `CREATE INDEX idx_digests_user_status ON public.notification_digests USING btree (user_id, status)` |
| notification_digests_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX notification_digests_pkey ON public.notification_digests USING btree (id)` |


## Policies (RLS)

### `Users can view their own digests`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
