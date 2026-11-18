# public.order_templates

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
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `name` | `text` | não |  |  |  |
| 4 | `description` | `text` | sim |  |  |  |
| 5 | `source_order_id` | `uuid` | sim |  |  |  |
| 6 | `client_id` | `text` | sim |  |  |  |
| 7 | `is_favorite` | `boolean` | não | `false` |  |  |
| 8 | `use_count` | `integer` | não | `0` |  |  |
| 9 | `last_used_at` | `timestamp with time zone` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| order_templates_name_check | CHECK | `CHECK (length(name) > 0 AND length(name) <= 200)` |  |  | sim |
| order_templates_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| order_templates_source_order_id_fkey | FOREIGN KEY | `FOREIGN KEY (source_order_id) REFERENCES orders(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| order_templates_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.order_template_items | order_template_items_template_id_fkey | template_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_fk_order_templates_source_order_id_fkey | btree | source_order_id | não | sim |  | `CREATE INDEX idx_fk_order_templates_source_order_id_fkey ON public.order_templates USING btree (source_order_id)` |
| idx_templates_favorite | btree | user_id, is_favorite | não | sim | `(is_favorite = true)` | `CREATE INDEX idx_templates_favorite ON public.order_templates USING btree (user_id, is_favorite) WHERE (is_favorite = true)` |
| idx_templates_user | btree | user_id | não | sim |  | `CREATE INDEX idx_templates_user ON public.order_templates USING btree (user_id)` |
| order_templates_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX order_templates_pkey ON public.order_templates USING btree (id)` |


## Policies (RLS)

### `templates_delete_self`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(user_id = ( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |

### `templates_deny_anon`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | anon |
| USING | `false` |
| WITH CHECK | `false` |

### `templates_insert_self`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(user_id = ( SELECT auth.uid() AS uid))` |

### `templates_select_self_or_admin`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((user_id = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'manager'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'dev'::app_role))` |
| WITH CHECK |  |

### `templates_update_self`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(user_id = ( SELECT auth.uid() AS uid))` |
| WITH CHECK | `(user_id = ( SELECT auth.uid() AS uid))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_order_templates_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
