# public.push_subscriptions

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
| 3 | `endpoint` | `text` | não |  |  |  |
| 4 | `p256dh` | `text` | não |  |  |  |
| 5 | `auth` | `text` | não |  |  |  |
| 6 | `user_agent` | `text` | sim |  |  |  |
| 7 | `device_type` | `text` | sim |  |  |  |
| 8 | `is_active` | `boolean` | sim | `true` |  |  |
| 9 | `last_used_at` | `timestamp with time zone` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| push_subscriptions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| push_subscriptions_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| unique_subscription | UNIQUE | `UNIQUE (user_id, endpoint)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_push_subscriptions_active | btree | user_id, is_active | não | sim | `is_active` | `CREATE INDEX idx_push_subscriptions_active ON public.push_subscriptions USING btree (user_id, is_active) WHERE is_active` |
| idx_push_subscriptions_user | btree | user_id | não | sim |  | `CREATE INDEX idx_push_subscriptions_user ON public.push_subscriptions USING btree (user_id)` |
| push_subscriptions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX push_subscriptions_pkey ON public.push_subscriptions USING btree (id)` |
| unique_subscription | btree | user_id, endpoint | sim | sim |  | `CREATE UNIQUE INDEX unique_subscription ON public.push_subscriptions USING btree (user_id, endpoint)` |


## Policies (RLS)

### `Users can manage own subscriptions`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() = user_id)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
