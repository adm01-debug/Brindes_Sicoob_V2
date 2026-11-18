# public.seller_discount_limits

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
| 3 | `max_discount_percent` | `numeric` | não | `5` |  |  |
| 4 | `set_by` | `uuid` | não |  |  |  |
| 5 | `notes` | `text` | sim |  |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| seller_discount_limits_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| seller_discount_limits_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| seller_discount_limits_user_id_key | UNIQUE | `UNIQUE (user_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_seller_discount_limits_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_seller_discount_limits_user_id ON public.seller_discount_limits USING btree (user_id)` |
| seller_discount_limits_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX seller_discount_limits_pkey ON public.seller_discount_limits USING btree (id)` |
| seller_discount_limits_user_id_key | btree | user_id | sim | sim |  | `CREATE UNIQUE INDEX seller_discount_limits_user_id_key ON public.seller_discount_limits USING btree (user_id)` |


## Policies (RLS)

### `sicoob_merged_3f25ea366dfb7d3d_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND can_approve_discount(( SELECT auth.uid() AS uid)))` |
| WITH CHECK |  |

### `sicoob_merged_486ddf08ce0901e5_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND can_approve_discount(( SELECT auth.uid() AS uid)))` |

### `sicoob_merged_4be53308710db207_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (user_id = ( SELECT auth.uid() AS uid))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND can_approve_discount(( SELECT auth.uid() AS uid))))` |
| WITH CHECK |  |

### `sicoob_merged_7002bb1cf0295b03_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND can_approve_discount(( SELECT auth.uid() AS uid)))` |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND can_approve_discount(( SELECT auth.uid() AS uid)))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_seller_discount_limits_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
