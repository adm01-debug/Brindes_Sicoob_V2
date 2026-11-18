# public.order_comments

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
| 2 | `order_id` | `uuid` | não |  |  |  |
| 3 | `parent_id` | `uuid` | sim |  |  |  |
| 4 | `author_id` | `uuid` | não |  |  |  |
| 5 | `author_role` | `text` | sim |  |  |  |
| 6 | `content` | `text` | não |  |  |  |
| 7 | `attachments` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 8 | `read_by` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 9 | `is_internal` | `boolean` | não | `false` |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `edited_at` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| order_comments_author_id_fkey | FOREIGN KEY | `FOREIGN KEY (author_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| order_comments_content_check | CHECK | `CHECK (length(content) > 0 AND length(content) <= 4000)` |  |  | sim |
| order_comments_order_id_fkey | FOREIGN KEY | `FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| order_comments_parent_id_fkey | FOREIGN KEY | `FOREIGN KEY (parent_id) REFERENCES order_comments(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| order_comments_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.order_comments | order_comments_parent_id_fkey | parent_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_comments_author | btree | author_id | não | sim |  | `CREATE INDEX idx_comments_author ON public.order_comments USING btree (author_id)` |
| idx_comments_order | btree | order_id, created_at | não | sim |  | `CREATE INDEX idx_comments_order ON public.order_comments USING btree (order_id, created_at)` |
| idx_order_comments_order_id | btree | order_id | não | sim |  | `CREATE INDEX idx_order_comments_order_id ON public.order_comments USING btree (order_id)` |
| idx_order_comments_parent_id | btree | parent_id | não | sim |  | `CREATE INDEX idx_order_comments_parent_id ON public.order_comments USING btree (parent_id)` |
| order_comments_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX order_comments_pkey ON public.order_comments USING btree (id)` |


## Policies (RLS)

### `comments_delete_self_or_admin`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((author_id = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'dev'::app_role))` |
| WITH CHECK |  |

### `comments_deny_anon`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | anon |
| USING | `false` |
| WITH CHECK | `false` |

### `comments_insert_self`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(is_order_owner_or_admin(order_id) AND (author_id = ( SELECT auth.uid() AS uid)))` |

### `comments_update_self`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(author_id = ( SELECT auth.uid() AS uid))` |
| WITH CHECK | `(author_id = ( SELECT auth.uid() AS uid))` |

### `order_comments_select_scoped`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'dev'::app_role) OR (EXISTS ( SELECT 1    FROM orders o   WHERE ((o.id = order_comments.order_id) AND ((o.seller_id = ( SELECT auth.uid() AS uid)) OR (o.organization_id IN ( SELECT get_user_org_ids(( SELECT auth.uid() AS uid)) AS get_user_org_ids)))))) OR (EXISTS ( SELECT 1    FROM (sicoob_orders so      LEFT JOIN profiles p ON ((p.id = ( SELECT auth.uid() AS uid))))   WHERE ((so.id = order_comments.order_id) AND ((so.created_by = ( SELECT auth.uid() AS uid)) OR ((p.role = 'gestor_pa'::text) AND (so.pa_id = p.pa_id)) OR ((p.role = 'gestor_singular'::text) AND (so.cooperative_id = p.cooperativa_id)) OR (p.role = ANY (ARRAY['supervisor'::text, 'logistics'::text])))))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_order_comments_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
