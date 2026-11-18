# public.qa_release_evidences

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
| 2 | `release_id` | `uuid` | sim |  |  |  |
| 3 | `file_url` | `text` | não |  |  |  |
| 4 | `file_name` | `text` | não |  |  |  |
| 5 | `file_type` | `text` | sim |  |  |  |
| 6 | `description` | `text` | sim |  |  |  |
| 7 | `uploaded_by` | `uuid` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| qa_release_evidences_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| qa_release_evidences_release_id_fkey | FOREIGN KEY | `FOREIGN KEY (release_id) REFERENCES qa_releases(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| qa_release_evidences_uploaded_by_fkey | FOREIGN KEY | `FOREIGN KEY (uploaded_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_fk_qa_release_evidences_release_id_fkey | btree | release_id | não | sim |  | `CREATE INDEX idx_fk_qa_release_evidences_release_id_fkey ON public.qa_release_evidences USING btree (release_id)` |
| idx_fk_qa_release_evidences_uploaded_by_fkey | btree | uploaded_by | não | sim |  | `CREATE INDEX idx_fk_qa_release_evidences_uploaded_by_fkey ON public.qa_release_evidences USING btree (uploaded_by)` |
| qa_release_evidences_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX qa_release_evidences_pkey ON public.qa_release_evidences USING btree (id)` |


## Policies (RLS)

### `sicoob_merged_08d546e37e47a1a7_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((true AND (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'diretoria'::text])))))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'dev'::app_role))))` |
| WITH CHECK |  |

### `sicoob_merged_9a9a09c04d1ec80c_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `((true AND (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'diretoria'::text])))))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'dev'::app_role))))` |

### `sicoob_merged_ca368cd6542dab8f_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(true AND (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'diretoria'::text]))))))` |
| WITH CHECK | `(true AND (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'diretoria'::text]))))))` |

### `sicoob_merged_df4323a989dda42b_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(true AND (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'diretoria'::text]))))))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
