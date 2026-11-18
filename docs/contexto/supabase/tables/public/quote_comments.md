# public.quote_comments

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
| 2 | `quote_id` | `text` | não |  |  |  |
| 3 | `user_id` | `uuid` | não |  |  |  |
| 4 | `parent_id` | `uuid` | sim |  |  |  |
| 5 | `content` | `text` | não |  |  |  |
| 6 | `is_edited` | `boolean` | não | `false` |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| quote_comments_parent_id_fkey | FOREIGN KEY | `FOREIGN KEY (parent_id) REFERENCES quote_comments(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| quote_comments_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.quote_comments | quote_comments_parent_id_fkey | parent_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_quote_comments_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_quote_comments_created_at ON public.quote_comments USING btree (created_at DESC)` |
| idx_quote_comments_parent_id | btree | parent_id | não | sim |  | `CREATE INDEX idx_quote_comments_parent_id ON public.quote_comments USING btree (parent_id)` |
| idx_quote_comments_quote_id | btree | quote_id | não | sim |  | `CREATE INDEX idx_quote_comments_quote_id ON public.quote_comments USING btree (quote_id)` |
| idx_quote_comments_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_quote_comments_user_id ON public.quote_comments USING btree (user_id)` |
| quote_comments_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX quote_comments_pkey ON public.quote_comments USING btree (id)` |


## Policies (RLS)

### `sicoob_merged_5033307590e7fbea_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND ((user_id = ( SELECT auth.uid() AS uid)) OR can_manage_quotes(( SELECT auth.uid() AS uid))))` |
| WITH CHECK |  |

### `sicoob_merged_64d72fb0ff67213d_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (user_id = ( SELECT auth.uid() AS uid)))` |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (user_id = ( SELECT auth.uid() AS uid)))` |

### `sicoob_merged_9a048ef7ce0a3b54_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_manager_or_admin()) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (EXISTS ( SELECT 1    FROM quotes q   WHERE (((q.id)::text = quote_comments.quote_id) AND (q.seller_id = ( SELECT auth.uid() AS uid)))))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND ((user_id = ( SELECT auth.uid() AS uid)) OR is_admin(( SELECT auth.uid() AS uid)))))` |
| WITH CHECK |  |

### `sicoob_merged_ddbd74d3c40fcfe6_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND ((user_id = ( SELECT auth.uid() AS uid)) AND (can_view_all_sales() OR (EXISTS ( SELECT 1    FROM quotes q   WHERE (((q.id)::text = quote_comments.quote_id) AND ((q.seller_id = ( SELECT auth.uid() AS uid)) OR (has_role(( SELECT auth.uid() AS uid), 'supervisor'::app_role) AND ((q.organization_id IS NULL) OR (q.organization_id IN ( SELECT get_user_org_ids(( SELECT auth.uid() AS uid)) AS get_user_org_ids)))))))))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_owner__quote_comments__user_id | BEFORE | INSERT | ROW | enabled | public.enforce_user_id_owner |


## Grants

_nenhum_
