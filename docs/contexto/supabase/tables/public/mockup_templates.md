# public.mockup_templates

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
| 3 | `name` | `text` | não |  |  |  |
| 4 | `description` | `text` | sim |  |  |  |
| 5 | `product_id` | `text` | sim |  |  |  |
| 6 | `product_name` | `text` | sim |  |  |  |
| 7 | `technique_id` | `text` | sim |  |  |  |
| 8 | `technique_name` | `text` | sim |  |  |  |
| 9 | `personalization_areas` | `jsonb` | não | `'[]'::jsonb` |  |  |
| 10 | `thumbnail_url` | `text` | sim |  |  |  |
| 11 | `usage_count` | `integer` | não | `0` |  |  |
| 12 | `is_favorite` | `boolean` | não | `false` |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| mockup_templates_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_mockup_templates_product | btree | product_id | não | sim |  | `CREATE INDEX idx_mockup_templates_product ON public.mockup_templates USING btree (product_id)` |
| idx_mockup_templates_user | btree | user_id | não | sim |  | `CREATE INDEX idx_mockup_templates_user ON public.mockup_templates USING btree (user_id)` |
| mockup_templates_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX mockup_templates_pkey ON public.mockup_templates USING btree (id)` |


## Policies (RLS)

### `Users delete own mockup templates`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK |  |

### `Users insert own mockup templates`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(( SELECT auth.uid() AS uid) = user_id)` |

### `Users update own mockup templates`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK |  |

### `Users view own mockup templates`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_owner__mockup_templates__user_id | BEFORE | INSERT | ROW | enabled | public.enforce_user_id_owner |
| update_mockup_templates_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
