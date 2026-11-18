# public.sales_goals

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
| 3 | `goal_type` | `text` | não | `'monthly'::text` |  |  |
| 4 | `target_value` | `numeric` | não | `0` |  |  |
| 5 | `current_value` | `numeric` | não | `0` |  |  |
| 6 | `target_quotes` | `integer` | sim | `0` |  |  |
| 7 | `current_quotes` | `integer` | sim | `0` |  |  |
| 8 | `target_conversions` | `integer` | sim | `0` |  |  |
| 9 | `current_conversions` | `integer` | sim | `0` |  |  |
| 10 | `start_date` | `date` | não |  |  |  |
| 11 | `end_date` | `date` | não |  |  |  |
| 12 | `is_achieved` | `boolean` | sim | `false` |  |  |
| 13 | `achieved_at` | `timestamp with time zone` | sim |  |  |  |
| 14 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sales_goals_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sales_goals_user_date | btree | user_id, start_date, end_date | não | sim |  | `CREATE INDEX idx_sales_goals_user_date ON public.sales_goals USING btree (user_id, start_date, end_date)` |
| sales_goals_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sales_goals_pkey ON public.sales_goals USING btree (id)` |


## Policies (RLS)

### `Users can create their own goals`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(user_id = ( SELECT auth.uid() AS uid))` |

### `Users can delete their own goals`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((user_id = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'admin'::app_role))` |
| WITH CHECK |  |

### `Users can update their own goals`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((user_id = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'admin'::app_role))` |
| WITH CHECK |  |

### `Users can view their own goals`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((user_id = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'admin'::app_role))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_sales_goals_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
