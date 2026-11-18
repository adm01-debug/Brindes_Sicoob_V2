# public.newsletter_subscribers

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 5 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `email` | `text` | não |  |  |  |
| 3 | `full_name` | `text` | sim |  |  |  |
| 4 | `is_active` | `boolean` | sim | `true` |  |  |
| 5 | `source` | `text` | sim |  |  |  |
| 6 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 7 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| newsletter_subscribers_email_key | UNIQUE | `UNIQUE (email)` |  |  | sim |
| newsletter_subscribers_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| newsletter_subscribers_email_key | btree | email | sim | sim |  | `CREATE UNIQUE INDEX newsletter_subscribers_email_key ON public.newsletter_subscribers USING btree (email)` |
| newsletter_subscribers_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX newsletter_subscribers_pkey ON public.newsletter_subscribers USING btree (id)` |


## Policies (RLS)

### `sicoob_anon_newsletter_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | anon |
| USING |  |
| WITH CHECK | `true` |

### `sicoob_merged_1d6cffad0396762b_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(true AND is_supervisor_or_above(( SELECT auth.uid() AS uid)))` |
| WITH CHECK |  |

### `sicoob_merged_236b8461d1c24398_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(true AND is_supervisor_or_above(( SELECT auth.uid() AS uid)))` |
| WITH CHECK |  |

### `sicoob_merged_d1dcebb13b54c844_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `((true AND true) OR (true AND is_supervisor_or_above(( SELECT auth.uid() AS uid))))` |

### `sicoob_merged_e4575cd08ffdde7e_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(true AND is_supervisor_or_above(( SELECT auth.uid() AS uid)))` |
| WITH CHECK | `(true AND is_supervisor_or_above(( SELECT auth.uid() AS uid)))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_updated_at_newsletter | BEFORE | UPDATE | ROW | enabled | public.handle_updated_at |


## Grants

_nenhum_
