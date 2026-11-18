# public.sicoob_order_artwork_versions

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `order_id` | `uuid` | não |  |  |  |
| 3 | `version` | `integer` | não |  |  |  |
| 4 | `file_path` | `text` | não |  |  |  |
| 5 | `file_sha256` | `text` | não |  |  |  |
| 6 | `identity_snapshot` | `jsonb` | não |  |  |  |
| 7 | `status` | `text` | não | `'pending'::text` |  |  |
| 8 | `is_latest` | `boolean` | não | `true` |  |  |
| 9 | `feedback` | `text` | sim |  |  |  |
| 10 | `created_by` | `uuid` | não |  |  |  |
| 11 | `decided_by` | `uuid` | sim |  |  |  |
| 12 | `decided_at` | `timestamp with time zone` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sicoob_order_artwork_versions_check | CHECK | `CHECK (file_path ~~ (order_id::text \|\| '/artwork/%'::text))` |  |  | sim |
| sicoob_order_artwork_versions_check1 | CHECK | `CHECK (status = 'pending'::text AND decided_by IS NULL AND decided_at IS NULL OR status <> 'pending'::text AND decided_by IS NOT NULL AND decided_at IS NOT NULL)` |  |  | sim |
| sicoob_order_artwork_versions_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| sicoob_order_artwork_versions_decided_by_fkey | FOREIGN KEY | `FOREIGN KEY (decided_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| sicoob_order_artwork_versions_file_sha256_check | CHECK | `CHECK (file_sha256 ~ '^[0-9a-f]{64}$'::text)` |  |  | sim |
| sicoob_order_artwork_versions_identity_snapshot_check | CHECK | `CHECK (jsonb_typeof(identity_snapshot) = 'object'::text)` |  |  | sim |
| sicoob_order_artwork_versions_order_id_fkey | FOREIGN KEY | `FOREIGN KEY (order_id) REFERENCES sicoob_orders(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| sicoob_order_artwork_versions_order_id_version_key | UNIQUE | `UNIQUE (order_id, version)` |  |  | sim |
| sicoob_order_artwork_versions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sicoob_order_artwork_versions_status_check | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'revision'::text]))` |  |  | sim |
| sicoob_order_artwork_versions_version_check | CHECK | `CHECK (version > 0)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_fk_sicoob_order_artwork_versions_created_by_fkey | btree | created_by | não | sim |  | `CREATE INDEX idx_fk_sicoob_order_artwork_versions_created_by_fkey ON public.sicoob_order_artwork_versions USING btree (created_by)` |
| idx_fk_sicoob_order_artwork_versions_decided_by_fkey | btree | decided_by | não | sim |  | `CREATE INDEX idx_fk_sicoob_order_artwork_versions_decided_by_fkey ON public.sicoob_order_artwork_versions USING btree (decided_by)` |
| idx_sicoob_order_artwork_order | btree | order_id, version | não | sim |  | `CREATE INDEX idx_sicoob_order_artwork_order ON public.sicoob_order_artwork_versions USING btree (order_id, version DESC)` |
| sicoob_order_artwork_versions_order_id_version_key | btree | order_id, version | sim | sim |  | `CREATE UNIQUE INDEX sicoob_order_artwork_versions_order_id_version_key ON public.sicoob_order_artwork_versions USING btree (order_id, version)` |
| sicoob_order_artwork_versions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sicoob_order_artwork_versions_pkey ON public.sicoob_order_artwork_versions USING btree (id)` |
| ux_sicoob_order_artwork_latest | btree | order_id | sim | sim | `is_latest` | `CREATE UNIQUE INDEX ux_sicoob_order_artwork_latest ON public.sicoob_order_artwork_versions USING btree (order_id) WHERE is_latest` |
| ux_sicoob_order_artwork_path | btree | order_id, file_path | sim | sim |  | `CREATE UNIQUE INDEX ux_sicoob_order_artwork_path ON public.sicoob_order_artwork_versions USING btree (order_id, file_path)` |


## Policies (RLS)

### `sicoob_artwork_read_in_order_scope`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `sicoob_current_actor_can_read_order(order_id)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_protect_sicoob_order_artwork_version | BEFORE | DELETE OR UPDATE | ROW | enabled | public.protect_sicoob_order_artwork_version |


## Grants

_nenhum_
