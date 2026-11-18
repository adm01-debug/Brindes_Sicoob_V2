# public.cooperativas_parceiras

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
| 2 | `name` | `text` | não |  |  |  |
| 3 | `registration_number` | `text` | sim |  |  |  |
| 4 | `contact_name` | `text` | sim |  |  |  |
| 5 | `contact_email` | `text` | sim |  |  |  |
| 6 | `phone` | `text` | sim |  |  |  |
| 7 | `is_active` | `boolean` | sim | `true` |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| cooperativas_parceiras_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| cooperativas_parceiras_registration_number_key | UNIQUE | `UNIQUE (registration_number)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| cooperativas_parceiras_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX cooperativas_parceiras_pkey ON public.cooperativas_parceiras USING btree (id)` |
| cooperativas_parceiras_registration_number_key | btree | registration_number | sim | sim |  | `CREATE UNIQUE INDEX cooperativas_parceiras_registration_number_key ON public.cooperativas_parceiras USING btree (registration_number)` |


## Policies (RLS)

### `Admins can manage cooperativas_parceiras`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'dev'::app_role))` |
| WITH CHECK | `(has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'dev'::app_role))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_updated_at_cooperativas | BEFORE | UPDATE | ROW | enabled | public.handle_updated_at |


## Grants

_nenhum_
