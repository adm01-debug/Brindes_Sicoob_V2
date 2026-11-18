# public.notifications

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | sim |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `user_id` | `uuid` | sim |  |  |  |
| 3 | `title` | `text` | não |  |  |  |
| 4 | `message` | `text` | não |  |  |  |
| 5 | `type` | `text` | não | `'info'::text` |  |  |
| 6 | `category` | `text` | sim | `'system'::text` |  |  |
| 7 | `source_system` | `text` | não |  |  |  |
| 8 | `source_entity_type` | `text` | sim |  |  |  |
| 9 | `source_entity_id` | `uuid` | sim |  |  |  |
| 10 | `channels` | `text[]` | sim | `ARRAY['in_app'::text]` |  |  |
| 11 | `is_read` | `boolean` | sim | `false` |  |  |
| 12 | `read_at` | `timestamp with time zone` | sim |  |  |  |
| 13 | `group_key` | `text` | sim |  |  |  |
| 14 | `is_grouped` | `boolean` | sim | `false` |  |  |
| 15 | `group_count` | `integer` | sim | `1` |  |  |
| 16 | `action_url` | `text` | sim |  |  |  |
| 17 | `action_label` | `text` | sim |  |  |  |
| 18 | `action_data` | `jsonb` | sim |  |  |  |
| 19 | `priority` | `integer` | sim | `0` |  |  |
| 20 | `scheduled_for` | `timestamp with time zone` | sim |  |  |  |
| 21 | `expires_at` | `timestamp with time zone` | sim |  |  |  |
| 22 | `delivered_at` | `timestamp with time zone` | sim |  |  |  |
| 23 | `delivery_status` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 24 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 25 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| notifications_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| notifications_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_notifications_group | btree | group_key | não | sim | `(group_key IS NOT NULL)` | `CREATE INDEX idx_notifications_group ON public.notifications USING btree (group_key) WHERE (group_key IS NOT NULL)` |
| idx_notifications_scheduled | btree | scheduled_for | não | sim | `(scheduled_for IS NOT NULL)` | `CREATE INDEX idx_notifications_scheduled ON public.notifications USING btree (scheduled_for) WHERE (scheduled_for IS NOT NULL)` |
| idx_notifications_source | btree | source_system, source_entity_type, source_entity_id | não | sim |  | `CREATE INDEX idx_notifications_source ON public.notifications USING btree (source_system, source_entity_type, source_entity_id)` |
| idx_notifications_unread | btree | user_id, is_read | não | sim | `(NOT is_read)` | `CREATE INDEX idx_notifications_unread ON public.notifications USING btree (user_id, is_read) WHERE (NOT is_read)` |
| idx_notifications_user | btree | user_id, created_at | não | sim |  | `CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id, created_at DESC)` |
| notifications_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id)` |


## Policies (RLS)

### `Users can delete own notifications`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK |  |

### `Users can update own notifications`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK |  |

### `Users can view own notifications`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK |  |

### `authenticated_create_notifications`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(user_id = ( SELECT auth.uid() AS uid))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trigger_update_notification_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_notification_updated_at |


## Grants

_nenhum_
