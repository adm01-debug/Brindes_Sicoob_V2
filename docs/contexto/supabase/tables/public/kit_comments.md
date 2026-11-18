# public.kit_comments

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | sim |
| replica identity | full |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `kit_id` | `uuid` | não |  |  |  |
| 3 | `author_id` | `uuid` | não |  |  |  |
| 4 | `parent_id` | `uuid` | sim |  |  |  |
| 5 | `item_anchor` | `text` | sim |  |  |  |
| 6 | `body` | `text` | não |  |  |  |
| 7 | `resolved` | `boolean` | não | `false` |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| kit_comments_kit_id_fkey | FOREIGN KEY | `FOREIGN KEY (kit_id) REFERENCES custom_kits(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| kit_comments_parent_id_fkey | FOREIGN KEY | `FOREIGN KEY (parent_id) REFERENCES kit_comments(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| kit_comments_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.kit_comments | kit_comments_parent_id_fkey | parent_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_kit_comments_kit | btree | kit_id | não | sim |  | `CREATE INDEX idx_kit_comments_kit ON public.kit_comments USING btree (kit_id)` |
| idx_kit_comments_parent | btree | parent_id | não | sim |  | `CREATE INDEX idx_kit_comments_parent ON public.kit_comments USING btree (parent_id)` |
| kit_comments_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX kit_comments_pkey ON public.kit_comments USING btree (id)` |


## Policies (RLS)

### `Author can delete own comment`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((author_id = ( SELECT auth.uid() AS uid)) OR is_admin(( SELECT auth.uid() AS uid)))` |
| WITH CHECK |  |

### `Author can edit own comment`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((author_id = ( SELECT auth.uid() AS uid)) OR is_admin(( SELECT auth.uid() AS uid)))` |
| WITH CHECK |  |

### `Owner or collab can comment`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `((author_id = ( SELECT auth.uid() AS uid)) AND (is_kit_owner(kit_id, ( SELECT auth.uid() AS uid)) OR is_kit_collaborator(kit_id, ( SELECT auth.uid() AS uid))))` |

### `View comments if owner/collab/admin`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(is_kit_owner(kit_id, ( SELECT auth.uid() AS uid)) OR is_kit_collaborator(kit_id, ( SELECT auth.uid() AS uid)) OR is_admin(( SELECT auth.uid() AS uid)))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_kit_comments_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
