# public.cms_sections

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
| 2 | `name` | `text` | não |  |  |  |
| 3 | `type` | `text` | não |  |  |  |
| 4 | `content` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 5 | `is_active` | `boolean` | sim | `true` |  |  |
| 6 | `sort_order` | `integer` | sim | `0` |  |  |
| 7 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| cms_sections_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| cms_sections_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX cms_sections_pkey ON public.cms_sections USING btree (id)` |


## Policies (RLS)

### `sicoob_anon_cms_sections_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon |
| USING | `(is_active IS TRUE)` |
| WITH CHECK |  |

### `sicoob_merged_5b314a2be4215412_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((true AND (is_active = true)) OR (true AND is_supervisor_or_above(( SELECT auth.uid() AS uid))))` |
| WITH CHECK |  |

### `sicoob_merged_625f2b92c9a452a0_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(true AND is_supervisor_or_above(( SELECT auth.uid() AS uid)))` |
| WITH CHECK | `(true AND is_supervisor_or_above(( SELECT auth.uid() AS uid)))` |

### `sicoob_merged_ca53ea5baba5ad45_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(true AND is_supervisor_or_above(( SELECT auth.uid() AS uid)))` |
| WITH CHECK |  |

### `sicoob_merged_d02325b7f28aa3e5_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `(true AND is_supervisor_or_above(( SELECT auth.uid() AS uid)))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_updated_at_sections | BEFORE | UPDATE | ROW | enabled | public.handle_updated_at |


## Grants

_nenhum_
