# public.sicoob_approval_policies

> Políticas versionadas por cooperativa. A ausência de política formal usa somente a base técnica conservadora.

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
| 2 | `cooperative_id` | `uuid` | sim |  |  |  |
| 3 | `version` | `text` | não |  |  |  |
| 4 | `effective_from` | `timestamp with time zone` | não | `now()` |  |  |
| 5 | `effective_until` | `timestamp with time zone` | sim |  |  |  |
| 6 | `is_active` | `boolean` | não | `true` |  |  |
| 7 | `forbid_self_approval` | `boolean` | não | `true` |  |  |
| 8 | `require_active_membership` | `boolean` | não | `true` |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sicoob_approval_policies_check | CHECK | `CHECK (effective_until IS NULL OR effective_until > effective_from)` |  |  | sim |
| sicoob_approval_policies_cooperative_id_fkey | FOREIGN KEY | `FOREIGN KEY (cooperative_id) REFERENCES cooperativas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| sicoob_approval_policies_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sicoob_approval_policies_version_check | CHECK | `CHECK (length(TRIM(BOTH FROM version)) > 0)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sicoob_approval_policies_lookup | btree | cooperative_id, is_active, effective_from | não | sim |  | `CREATE INDEX idx_sicoob_approval_policies_lookup ON public.sicoob_approval_policies USING btree (cooperative_id, is_active, effective_from DESC)` |
| sicoob_approval_policies_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sicoob_approval_policies_pkey ON public.sicoob_approval_policies USING btree (id)` |
| ux_sicoob_approval_policy_version | btree | cooperative_id, version | sim | sim |  | `CREATE UNIQUE INDEX ux_sicoob_approval_policy_version ON public.sicoob_approval_policies USING btree (cooperative_id, version) NULLS NOT DISTINCT` |


## Policies (RLS)

### `Central administra políticas de aprovação Sicoob`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM (user_roles ur      JOIN profiles p ON (((p.user_id = ur.user_id) OR (p.id = ur.user_id))))   WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND ((ur.role)::text = ANY (ARRAY['admin'::text, 'dev'::text, 'supervisor'::text])) AND (p.is_active IS TRUE) AND (p.deleted_at IS NULL))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM (user_roles ur      JOIN profiles p ON (((p.user_id = ur.user_id) OR (p.id = ur.user_id))))   WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND ((ur.role)::text = ANY (ARRAY['admin'::text, 'dev'::text, 'supervisor'::text])) AND (p.is_active IS TRUE) AND (p.deleted_at IS NULL))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_protect_sicoob_approval_policy_version | BEFORE | DELETE OR UPDATE | ROW | enabled | public.protect_sicoob_approval_policy_version |


## Grants

_nenhum_
