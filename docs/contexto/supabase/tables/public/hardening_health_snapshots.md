# public.hardening_health_snapshots

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
| 2 | `snapshot_at` | `timestamp with time zone` | não | `now()` |  |  |
| 3 | `score` | `integer` | não |  |  |  |
| 4 | `max_score` | `integer` | não | `5` |  |  |
| 5 | `failures` | `text[]` | não | `ARRAY[]::text[]` |  |  |
| 6 | `details` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| hardening_health_snapshots_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| hardening_health_snapshots_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX hardening_health_snapshots_pkey ON public.hardening_health_snapshots USING btree (id)` |
| idx_hardening_snapshots_at | btree | snapshot_at | não | sim |  | `CREATE INDEX idx_hardening_snapshots_at ON public.hardening_health_snapshots USING btree (snapshot_at DESC)` |


## Policies (RLS)

### `Devs read hardening snapshots`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_dev(( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
