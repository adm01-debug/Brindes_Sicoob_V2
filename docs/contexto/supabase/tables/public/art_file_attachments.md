# public.art_file_attachments

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
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `mockup_id` | `uuid` | sim |  |  |  |
| 4 | `quote_id` | `uuid` | sim |  |  |  |
| 5 | `file_url` | `text` | não |  |  |  |
| 6 | `file_path` | `text` | não |  |  |  |
| 7 | `original_name` | `text` | não |  |  |  |
| 8 | `mime_type` | `text` | sim |  |  |  |
| 9 | `file_size_bytes` | `bigint` | sim |  |  |  |
| 10 | `file_extension` | `text` | sim |  |  |  |
| 11 | `notes` | `text` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| art_file_attachments_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| art_file_attachments_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX art_file_attachments_pkey ON public.art_file_attachments USING btree (id)` |
| idx_art_files_mockup | btree | mockup_id | não | sim |  | `CREATE INDEX idx_art_files_mockup ON public.art_file_attachments USING btree (mockup_id)` |
| idx_art_files_quote | btree | quote_id | não | sim |  | `CREATE INDEX idx_art_files_quote ON public.art_file_attachments USING btree (quote_id)` |
| idx_art_files_user | btree | user_id | não | sim |  | `CREATE INDEX idx_art_files_user ON public.art_file_attachments USING btree (user_id)` |


## Policies (RLS)

### `Users delete own art files`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK |  |

### `Users insert own art files`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(( SELECT auth.uid() AS uid) = user_id)` |

### `Users update own art files`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK |  |

### `Users view own art files`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_owner__art_file_attachments__user_id | BEFORE | INSERT | ROW | enabled | public.enforce_user_id_owner |
| update_art_files_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
