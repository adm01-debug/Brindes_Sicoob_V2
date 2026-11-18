# public.catalog_marketing_terms

> Vocabulário editorial do portal para classificar produtos externos sem alterar o cadastro mestre.

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
| usada por views | public.catalog_marketing_term_usage |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `category` | `text` | não |  |  |  |
| 3 | `slug` | `text` | não |  |  |  |
| 4 | `name` | `text` | não |  |  |  |
| 5 | `description` | `text` | sim |  |  |  |
| 6 | `is_active` | `boolean` | não | `true` |  |  |
| 7 | `sort_order` | `integer` | não | `0` |  |  |
| 8 | `created_by` | `uuid` | sim | `auth.uid()` |  |  |
| 9 | `updated_by` | `uuid` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| catalog_marketing_terms_category_check | CHECK | `CHECK (category = ANY (ARRAY['publico_alvo'::text, 'endomarketing'::text, 'tema_sicoob'::text]))` |  |  | sim |
| catalog_marketing_terms_category_slug_key | UNIQUE | `UNIQUE (category, slug)` |  |  | sim |
| catalog_marketing_terms_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| catalog_marketing_terms_name_check | CHECK | `CHECK (length(btrim(name)) >= 2 AND length(btrim(name)) <= 120)` |  |  | sim |
| catalog_marketing_terms_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| catalog_marketing_terms_slug_check | CHECK | `CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text)` |  |  | sim |
| catalog_marketing_terms_sort_order_check | CHECK | `CHECK (sort_order >= 0)` |  |  | sim |
| catalog_marketing_terms_updated_by_fkey | FOREIGN KEY | `FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.catalog_product_marketing | catalog_product_marketing_term_id_fkey | term_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| catalog_marketing_terms_category_slug_key | btree | category, slug | sim | sim |  | `CREATE UNIQUE INDEX catalog_marketing_terms_category_slug_key ON public.catalog_marketing_terms USING btree (category, slug)` |
| catalog_marketing_terms_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX catalog_marketing_terms_pkey ON public.catalog_marketing_terms USING btree (id)` |
| idx_catalog_marketing_terms_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_catalog_marketing_terms_created_by ON public.catalog_marketing_terms USING btree (created_by)` |
| idx_catalog_marketing_terms_updated_by | btree | updated_by | não | sim |  | `CREATE INDEX idx_catalog_marketing_terms_updated_by ON public.catalog_marketing_terms USING btree (updated_by)` |


## Policies (RLS)

### `Atores ativos leem termos de marketing`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `sicoob_actor_is_active(( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |

### `Curadores atualizam termos de marketing`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(sicoob_actor_is_active(( SELECT auth.uid() AS uid)) AND (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'supervisor'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'dev'::app_role)))` |
| WITH CHECK | `(sicoob_actor_is_active(( SELECT auth.uid() AS uid)) AND (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'supervisor'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'dev'::app_role)))` |

### `Curadores inserem termos de marketing`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((created_by = ( SELECT auth.uid() AS uid)) AND sicoob_actor_is_active(( SELECT auth.uid() AS uid)) AND (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'supervisor'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'dev'::app_role)))` |

### `Curadores removem termos de marketing`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(sicoob_actor_is_active(( SELECT auth.uid() AS uid)) AND (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'supervisor'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'dev'::app_role)))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| preserve_catalog_marketing_term_authorship | BEFORE | UPDATE | ROW | enabled | public.preserve_catalog_marketing_term_authorship |
| set_catalog_marketing_terms_updated_at | BEFORE | UPDATE | ROW | enabled | public.handle_updated_at |


## Grants

_nenhum_
