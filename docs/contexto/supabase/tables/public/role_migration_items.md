# public.role_migration_items

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
| 2 | `batch_id` | `uuid` | não |  |  |  |
| 3 | `user_id` | `uuid` | não |  |  |  |
| 4 | `user_email` | `text` | sim |  |  |  |
| 5 | `from_role` | `app_role` | sim |  |  |  |
| 6 | `to_role` | `app_role` | não |  |  |  |
| 7 | `operation` | `text` | não |  |  |  |
| 8 | `status` | `role_migration_item_status` | não | `'pending'::role_migration_item_status` |  |  |
| 9 | `error_message` | `text` | sim |  |  |  |
| 10 | `duration_ms` | `integer` | sim |  |  |  |
| 11 | `processed_at` | `timestamp with time zone` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| role_migration_items_batch_id_fkey | FOREIGN KEY | `FOREIGN KEY (batch_id) REFERENCES role_migration_batches(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| role_migration_items_operation_check | CHECK | `CHECK (operation = ANY (ARRAY['add'::text, 'remove'::text, 'replace'::text]))` |  |  | sim |
| role_migration_items_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_role_mig_items_batch | btree | batch_id | não | sim |  | `CREATE INDEX idx_role_mig_items_batch ON public.role_migration_items USING btree (batch_id)` |
| idx_role_mig_items_status | btree | status | não | sim |  | `CREATE INDEX idx_role_mig_items_status ON public.role_migration_items USING btree (status)` |
| idx_role_mig_items_user | btree | user_id | não | sim |  | `CREATE INDEX idx_role_mig_items_user ON public.role_migration_items USING btree (user_id)` |
| role_migration_items_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX role_migration_items_pkey ON public.role_migration_items USING btree (id)` |


## Policies (RLS)

### `No direct delete role_migration_items`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `false` |
| WITH CHECK |  |

### `No direct insert role_migration_items`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `false` |

### `No direct update role_migration_items`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `false` |
| WITH CHECK | `false` |

### `Supervisors+ can read role_migration_items`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_supervisor_or_above(( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
