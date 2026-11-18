# public.qa_releases

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
| 2 | `version_tag` | `text` | não |  |  |  |
| 3 | `description` | `text` | sim |  |  |  |
| 4 | `status` | `text` | sim | `'pending'::text` |  |  |
| 5 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 6 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 7 | `approved_by` | `uuid` | sim |  |  |  |
| 8 | `approved_at` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| qa_releases_approved_by_fkey | FOREIGN KEY | `FOREIGN KEY (approved_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| qa_releases_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| qa_releases_status_check | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'testing'::text, 'approved'::text, 'rejected'::text]))` |  |  | sim |
| qa_releases_version_tag_key | UNIQUE | `UNIQUE (version_tag)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.qa_release_evidences | qa_release_evidences_release_id_fkey | release_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_fk_qa_releases_approved_by_fkey | btree | approved_by | não | sim |  | `CREATE INDEX idx_fk_qa_releases_approved_by_fkey ON public.qa_releases USING btree (approved_by)` |
| qa_releases_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX qa_releases_pkey ON public.qa_releases USING btree (id)` |
| qa_releases_version_tag_key | btree | version_tag | sim | sim |  | `CREATE UNIQUE INDEX qa_releases_version_tag_key ON public.qa_releases USING btree (version_tag)` |


## Policies (RLS)

### `sicoob_merged_26c7966e8e382f81_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((true AND (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'diretoria'::text])))))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'dev'::app_role))))` |
| WITH CHECK |  |

### `sicoob_merged_72b0add9459d66c5_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(true AND (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'diretoria'::text]))))))` |
| WITH CHECK |  |

### `sicoob_merged_84c20ea433e4ee6a_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(true AND (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'diretoria'::text]))))))` |
| WITH CHECK | `(true AND (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'diretoria'::text]))))))` |

### `sicoob_merged_e09266c921af7f9d_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `((true AND (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'diretoria'::text])))))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'dev'::app_role))))` |


## Triggers

_nenhum_


## Grants

_nenhum_
