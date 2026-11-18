# public.workspace_notifications

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `title` | `text` | não |  |  |  |
| 4 | `message` | `text` | não |  |  |  |
| 5 | `type` | `text` | não | `'info'::text` |  |  |
| 6 | `category` | `text` | não | `'system'::text` |  |  |
| 7 | `is_read` | `boolean` | não | `false` |  |  |
| 8 | `action_url` | `text` | sim |  |  |  |
| 9 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| workspace_notifications_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_notifications_created | btree | created_at | não | sim |  | `CREATE INDEX idx_notifications_created ON public.workspace_notifications USING btree (created_at DESC)` |
| idx_workspace_notifications_user_unread | btree | user_id, is_read, created_at | não | sim |  | `CREATE INDEX idx_workspace_notifications_user_unread ON public.workspace_notifications USING btree (user_id, is_read, created_at DESC)` |
| workspace_notifications_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX workspace_notifications_pkey ON public.workspace_notifications USING btree (id)` |


## Policies (RLS)

### `sicoob_merged_11d7b23a6c3c86be_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (user_id = ( SELECT auth.uid() AS uid)))` |

### `sicoob_merged_4c8bf96603565bc0_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (user_id = ( SELECT auth.uid() AS uid))) OR (true AND (( SELECT auth.uid() AS uid) = user_id)))` |
| WITH CHECK | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (user_id = ( SELECT auth.uid() AS uid))) OR (true AND (( SELECT auth.uid() AS uid) = user_id)))` |

### `sicoob_merged_9ef19691265ad966_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (user_id = ( SELECT auth.uid() AS uid))) OR (true AND (( SELECT auth.uid() AS uid) = user_id)))` |
| WITH CHECK |  |

### `sicoob_merged_e624430a13e0036f_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (user_id = ( SELECT auth.uid() AS uid))) OR (true AND (( SELECT auth.uid() AS uid) = user_id)))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
