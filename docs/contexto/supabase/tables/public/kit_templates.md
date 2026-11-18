# public.kit_templates

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
| 2 | `name` | `text` | não |  |  |  |
| 3 | `description` | `text` | sim |  |  |  |
| 4 | `category` | `text` | não | `'Geral'::text` |  |  |
| 5 | `color` | `text` | não | `'#3B82F6'::text` |  |  |
| 6 | `icon` | `text` | não | `'Package'::text` |  |  |
| 7 | `tag` | `text` | sim |  |  |  |
| 8 | `cover_image_url` | `text` | sim |  |  |  |
| 9 | `box_data` | `jsonb` | sim |  |  |  |
| 10 | `items_data` | `jsonb` | não | `'[]'::jsonb` |  |  |
| 11 | `personalization_data` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 12 | `total_price` | `numeric` | não | `0` |  |  |
| 13 | `volume_usage_percent` | `numeric` | não | `0` |  |  |
| 14 | `usage_count` | `integer` | não | `0` |  |  |
| 15 | `is_active` | `boolean` | não | `true` |  |  |
| 16 | `created_by` | `uuid` | sim |  |  |  |
| 17 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 18 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| kit_templates_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_kit_templates_active_category | btree | is_active, category | não | sim |  | `CREATE INDEX idx_kit_templates_active_category ON public.kit_templates USING btree (is_active, category)` |
| idx_kit_templates_usage | btree | usage_count | não | sim | `(is_active = true)` | `CREATE INDEX idx_kit_templates_usage ON public.kit_templates USING btree (usage_count DESC) WHERE (is_active = true)` |
| kit_templates_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX kit_templates_pkey ON public.kit_templates USING btree (id)` |


## Policies (RLS)

### `Admins can delete templates`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin(( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |

### `Admins can insert templates`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_admin(( SELECT auth.uid() AS uid))` |

### `Admins can update templates`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin(( SELECT auth.uid() AS uid))` |
| WITH CHECK | `is_admin(( SELECT auth.uid() AS uid))` |

### `Authenticated users can view active templates`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((is_active = true) OR is_admin(( SELECT auth.uid() AS uid)))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_kit_templates_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
