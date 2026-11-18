# public.catalog_product_marketing

> Associa produtos do catálogo externo a termos editoriais do portal Sicoob.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.catalog_marketing_term_usage |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `product_id` | `text` | não |  |  |  |
| 2 | `term_id` | `uuid` | não |  |  |  |
| 3 | `created_by` | `uuid` | sim | `auth.uid()` |  |  |
| 4 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| catalog_product_marketing_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| catalog_product_marketing_pkey | PRIMARY KEY | `PRIMARY KEY (product_id, term_id)` |  |  | sim |
| catalog_product_marketing_product_id_check | CHECK | `CHECK (length(btrim(product_id)) >= 1 AND length(btrim(product_id)) <= 200)` |  |  | sim |
| catalog_product_marketing_term_id_fkey | FOREIGN KEY | `FOREIGN KEY (term_id) REFERENCES catalog_marketing_terms(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| catalog_product_marketing_pkey | btree | product_id, term_id | sim | sim |  | `CREATE UNIQUE INDEX catalog_product_marketing_pkey ON public.catalog_product_marketing USING btree (product_id, term_id)` |
| idx_catalog_product_marketing_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_catalog_product_marketing_created_by ON public.catalog_product_marketing USING btree (created_by)` |
| idx_catalog_product_marketing_term_product | btree | term_id, product_id | não | sim |  | `CREATE INDEX idx_catalog_product_marketing_term_product ON public.catalog_product_marketing USING btree (term_id, product_id)` |


## Policies (RLS)

### `Atores ativos leem classificacoes de marketing`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `sicoob_actor_is_active(( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |

### `Curadores inserem classificacoes de marketing`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(sicoob_actor_is_active(( SELECT auth.uid() AS uid)) AND (created_by = ( SELECT auth.uid() AS uid)) AND (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'supervisor'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'dev'::app_role)))` |

### `Curadores removem classificacoes de marketing`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(sicoob_actor_is_active(( SELECT auth.uid() AS uid)) AND (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'supervisor'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'dev'::app_role)))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
