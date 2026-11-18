# public.scheduled_reports

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
| 3 | `report_type` | `text` | não | `'sales'::text` |  |  |
| 4 | `frequency` | `text` | não | `'weekly'::text` |  |  |
| 5 | `email_to` | `text` | não |  |  |  |
| 6 | `report_name` | `text` | não | `'Relatório'::text` |  |  |
| 7 | `filters` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 8 | `is_active` | `boolean` | não | `true` |  |  |
| 9 | `last_sent_at` | `timestamp with time zone` | sim |  |  |  |
| 10 | `next_run_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| scheduled_reports_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| valid_frequency | CHECK | `CHECK (frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text]))` |  |  | sim |
| valid_report_type | CHECK | `CHECK (report_type = ANY (ARRAY['sales'::text, 'quotes'::text, 'clients'::text, 'products'::text, 'orders'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_scheduled_reports_next_run | btree | next_run_at | não | sim | `(is_active = true)` | `CREATE INDEX idx_scheduled_reports_next_run ON public.scheduled_reports USING btree (next_run_at) WHERE (is_active = true)` |
| scheduled_reports_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX scheduled_reports_pkey ON public.scheduled_reports USING btree (id)` |


## Policies (RLS)

### `Users can create own scheduled reports`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(( SELECT auth.uid() AS uid) = user_id)` |

### `Users can delete own scheduled reports`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK |  |

### `Users can update own scheduled reports`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK |  |

### `Users can view own scheduled reports`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_owner__scheduled_reports__user_id | BEFORE | INSERT | ROW | enabled | public.enforce_user_id_owner |
| trg_validate_report_email | BEFORE | INSERT OR UPDATE | ROW | enabled | public.validate_scheduled_report_email |


## Grants

_nenhum_
