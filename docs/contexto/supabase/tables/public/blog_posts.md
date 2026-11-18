# public.blog_posts

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
| 2 | `title` | `text` | não |  |  |  |
| 3 | `slug` | `text` | não |  |  |  |
| 4 | `content` | `text` | não |  |  |  |
| 5 | `excerpt` | `text` | sim |  |  |  |
| 6 | `author_id` | `uuid` | sim |  |  |  |
| 7 | `featured_image_url` | `text` | sim |  |  |  |
| 8 | `category` | `text` | sim |  |  |  |
| 9 | `is_published` | `boolean` | sim | `false` |  |  |
| 10 | `published_at` | `timestamp with time zone` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| blog_posts_author_id_fkey | FOREIGN KEY | `FOREIGN KEY (author_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| blog_posts_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| blog_posts_slug_key | UNIQUE | `UNIQUE (slug)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| blog_posts_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX blog_posts_pkey ON public.blog_posts USING btree (id)` |
| blog_posts_slug_key | btree | slug | sim | sim |  | `CREATE UNIQUE INDEX blog_posts_slug_key ON public.blog_posts USING btree (slug)` |
| idx_fk_blog_posts_author_id_fkey | btree | author_id | não | sim |  | `CREATE INDEX idx_fk_blog_posts_author_id_fkey ON public.blog_posts USING btree (author_id)` |


## Policies (RLS)

### `sicoob_merged_476f3954c8e72505_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superuser'::text]))))))` |

### `sicoob_merged_b6bfc29875a149da_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superuser'::text]))))))` |
| WITH CHECK |  |

### `sicoob_merged_b755cd0acd256a62_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superuser'::text])))))) OR (true AND (is_published = true)))` |
| WITH CHECK |  |

### `sicoob_merged_c6a13972a3bb7647_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superuser'::text]))))))` |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superuser'::text]))))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_blog_posts_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
