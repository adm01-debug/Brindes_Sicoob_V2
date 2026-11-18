# public.scheduled_exports

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
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `entity_type` | `text` | não |  |  |  |
| 4 | `export_type` | `text` | não |  |  |  |
| 5 | `filters` | `jsonb` | sim |  |  |  |
| 6 | `frequency` | `text` | não |  |  |  |
| 7 | `last_run_at` | `timestamp with time zone` | sim |  |  |  |
| 8 | `next_run_at` | `timestamp with time zone` | sim |  |  |  |
| 9 | `is_active` | `boolean` | sim | `true` |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| scheduled_exports_entity_type_check | CHECK | `CHECK (entity_type = ANY (ARRAY['orders'::text, 'quotes'::text]))` |  |  | sim |
| scheduled_exports_export_type_check | CHECK | `CHECK (export_type = ANY (ARRAY['pdf'::text, 'excel'::text]))` |  |  | sim |
| scheduled_exports_frequency_check | CHECK | `CHECK (frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text]))` |  |  | sim |
| scheduled_exports_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| scheduled_exports_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_fk_scheduled_exports_user_id_fkey | btree | user_id | não | sim |  | `CREATE INDEX idx_fk_scheduled_exports_user_id_fkey ON public.scheduled_exports USING btree (user_id)` |
| scheduled_exports_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX scheduled_exports_pkey ON public.scheduled_exports USING btree (id)` |


## Policies (RLS)

### `Users can manage their own scheduled exports`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
