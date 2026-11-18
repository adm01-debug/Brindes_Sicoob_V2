# public.role_migration_batches

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
| 2 | `label` | `text` | não |  |  |  |
| 3 | `reason` | `text` | não |  |  |  |
| 4 | `initiated_by` | `uuid` | não |  |  |  |
| 5 | `dry_run` | `boolean` | não | `false` |  |  |
| 6 | `status` | `role_migration_status` | não | `'pending'::role_migration_status` |  |  |
| 7 | `total_items` | `integer` | não | `0` |  |  |
| 8 | `success_count` | `integer` | não | `0` |  |  |
| 9 | `failed_count` | `integer` | não | `0` |  |  |
| 10 | `skipped_count` | `integer` | não | `0` |  |  |
| 11 | `started_at` | `timestamp with time zone` | sim |  |  |  |
| 12 | `finished_at` | `timestamp with time zone` | sim |  |  |  |
| 13 | `duration_ms` | `integer` | sim |  |  |  |
| 14 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| role_migration_batches_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.role_migration_items | role_migration_items_batch_id_fkey | batch_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_role_mig_batches_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_role_mig_batches_created_at ON public.role_migration_batches USING btree (created_at DESC)` |
| idx_role_mig_batches_initiated_by | btree | initiated_by | não | sim |  | `CREATE INDEX idx_role_mig_batches_initiated_by ON public.role_migration_batches USING btree (initiated_by)` |
| role_migration_batches_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX role_migration_batches_pkey ON public.role_migration_batches USING btree (id)` |


## Policies (RLS)

### `No direct delete role_migration_batches`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `false` |
| WITH CHECK |  |

### `No direct insert role_migration_batches`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `false` |

### `No direct update role_migration_batches`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `false` |
| WITH CHECK | `false` |

### `Supervisors+ can read role_migration_batches`

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
