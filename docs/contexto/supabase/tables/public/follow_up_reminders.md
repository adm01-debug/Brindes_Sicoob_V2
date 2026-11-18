# public.follow_up_reminders

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
| 2 | `quote_id` | `text` | não |  |  |  |
| 3 | `seller_id` | `uuid` | não |  |  |  |
| 4 | `reminder_type` | `text` | não | `'expiring'::text` |  |  |
| 5 | `scheduled_for` | `timestamp with time zone` | não |  |  |  |
| 6 | `is_sent` | `boolean` | não | `false` |  |  |
| 7 | `sent_at` | `timestamp with time zone` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `title` | `text` | sim | `''::text` |  |  |
| 10 | `notes` | `text` | sim |  |  |  |
| 11 | `is_completed` | `boolean` | não | `false` |  |  |
| 12 | `completed_at` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| follow_up_reminders_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| follow_up_reminders_seller_id_fkey | FOREIGN KEY | `FOREIGN KEY (seller_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| follow_up_reminders_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX follow_up_reminders_pkey ON public.follow_up_reminders USING btree (id)` |
| idx_follow_up_pending | btree | is_sent, scheduled_for | não | sim |  | `CREATE INDEX idx_follow_up_pending ON public.follow_up_reminders USING btree (is_sent, scheduled_for)` |
| idx_follow_up_reminders_completed | btree | is_completed, scheduled_for | não | sim |  | `CREATE INDEX idx_follow_up_reminders_completed ON public.follow_up_reminders USING btree (is_completed, scheduled_for)` |
| idx_follow_up_reminders_seller_scheduled | btree | seller_id, scheduled_for | não | sim |  | `CREATE INDEX idx_follow_up_reminders_seller_scheduled ON public.follow_up_reminders USING btree (seller_id, scheduled_for DESC)` |


## Policies (RLS)

### `Users can manage own reminders`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(seller_id = ( SELECT auth.uid() AS uid))` |
| WITH CHECK | `(seller_id = ( SELECT auth.uid() AS uid))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_owner__follow_up_reminders__seller_id | BEFORE | INSERT | ROW | enabled | public.enforce_seller_id_owner |


## Grants

_nenhum_
