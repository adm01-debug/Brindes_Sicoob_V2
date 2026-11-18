# public.singulares

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
| 3 | `code` | `text` | não |  |  |  |
| 4 | `address` | `text` | sim |  |  |  |
| 5 | `phone` | `text` | sim |  |  |  |
| 6 | `email` | `text` | sim |  |  |  |
| 7 | `is_active` | `boolean` | sim | `true` |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| singulares_code_key | UNIQUE | `UNIQUE (code)` |  |  | sim |
| singulares_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| singulares_code_key | btree | code | sim | sim |  | `CREATE UNIQUE INDEX singulares_code_key ON public.singulares USING btree (code)` |
| singulares_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX singulares_pkey ON public.singulares USING btree (id)` |


## Policies (RLS)

### `Admins can manage singulares`

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
| set_updated_at_singulares | BEFORE | UPDATE | ROW | enabled | public.handle_updated_at |


## Grants

_nenhum_
