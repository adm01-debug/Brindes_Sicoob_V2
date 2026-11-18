# public.sicoob_approval_delegations

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
| 2 | `delegator_id` | `uuid` | não |  |  |  |
| 3 | `delegate_id` | `uuid` | não |  |  |  |
| 4 | `cooperative_id` | `uuid` | não |  |  |  |
| 5 | `pa_id` | `uuid` | sim |  |  |  |
| 6 | `competencies` | `text[]` | não |  |  |  |
| 7 | `starts_at` | `timestamp with time zone` | não |  |  |  |
| 8 | `ends_at` | `timestamp with time zone` | não |  |  |  |
| 9 | `reason` | `text` | não |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `clock_timestamp()` |  |  |
| 11 | `revoked_at` | `timestamp with time zone` | sim |  |  |  |
| 12 | `revoked_by` | `uuid` | sim |  |  |  |
| 13 | `revocation_reason` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sicoob_approval_delegation_competencies | CHECK | `CHECK (cardinality(competencies) > 0 AND competencies <@ ARRAY['approve_order'::text, 'reject_order'::text])` |  |  | sim |
| sicoob_approval_delegation_distinct_actors | CHECK | `CHECK (delegator_id <> delegate_id)` |  |  | sim |
| sicoob_approval_delegation_reason | CHECK | `CHECK (length(btrim(reason)) >= 10)` |  |  | sim |
| sicoob_approval_delegation_revocation_complete | CHECK | `CHECK (revoked_at IS NULL AND revoked_by IS NULL AND revocation_reason IS NULL OR revoked_at IS NOT NULL AND revoked_by IS NOT NULL AND length(btrim(revocation_reason)) >= 10)` |  |  | sim |
| sicoob_approval_delegation_valid_period | CHECK | `CHECK (ends_at > starts_at AND ends_at <= (starts_at + '90 days'::interval))` |  |  | sim |
| sicoob_approval_delegations_cooperative_id_fkey | FOREIGN KEY | `FOREIGN KEY (cooperative_id) REFERENCES cooperativas(id)` | NO ACTION | NO ACTION | sim |
| sicoob_approval_delegations_delegate_id_fkey | FOREIGN KEY | `FOREIGN KEY (delegate_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| sicoob_approval_delegations_delegator_id_fkey | FOREIGN KEY | `FOREIGN KEY (delegator_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| sicoob_approval_delegations_pa_id_fkey | FOREIGN KEY | `FOREIGN KEY (pa_id) REFERENCES postos_atendimento(id)` | NO ACTION | NO ACTION | sim |
| sicoob_approval_delegations_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sicoob_approval_delegations_revoked_by_fkey | FOREIGN KEY | `FOREIGN KEY (revoked_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.sicoob_approval_requests | sicoob_approval_requests_approval_delegation_id_fkey | approval_delegation_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sicoob_approval_delegations_pa_id | btree | pa_id | não | sim |  | `CREATE INDEX idx_sicoob_approval_delegations_pa_id ON public.sicoob_approval_delegations USING btree (pa_id)` |
| idx_sicoob_approval_delegations_revoked_by | btree | revoked_by | não | sim |  | `CREATE INDEX idx_sicoob_approval_delegations_revoked_by ON public.sicoob_approval_delegations USING btree (revoked_by)` |
| sicoob_approval_delegations_delegate_active_idx | btree | delegate_id, starts_at, ends_at | não | sim | `(revoked_at IS NULL)` | `CREATE INDEX sicoob_approval_delegations_delegate_active_idx ON public.sicoob_approval_delegations USING btree (delegate_id, starts_at, ends_at) WHERE (revoked_at IS NULL)` |
| sicoob_approval_delegations_delegator_idx | btree | delegator_id, created_at | não | sim |  | `CREATE INDEX sicoob_approval_delegations_delegator_idx ON public.sicoob_approval_delegations USING btree (delegator_id, created_at DESC)` |
| sicoob_approval_delegations_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sicoob_approval_delegations_pkey ON public.sicoob_approval_delegations USING btree (id)` |
| sicoob_approval_delegations_scope_idx | btree | cooperative_id, pa_id | não | sim | `(revoked_at IS NULL)` | `CREATE INDEX sicoob_approval_delegations_scope_idx ON public.sicoob_approval_delegations USING btree (cooperative_id, pa_id) WHERE (revoked_at IS NULL)` |


## Policies (RLS)

### `sicoob_approval_delegations_read_participants`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((delegator_id = ( SELECT auth.uid() AS uid)) OR (delegate_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1    FROM user_roles actor_role   WHERE ((actor_role.user_id = ( SELECT auth.uid() AS uid)) AND ((actor_role.role)::text = ANY (ARRAY['admin'::text, 'manager'::text, 'dev'::text, 'supervisor'::text]))))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_protect_sicoob_approval_delegation | BEFORE | DELETE OR UPDATE | ROW | enabled | public.protect_sicoob_approval_delegation |
| tr_validate_sicoob_approval_delegate_role | BEFORE | INSERT | ROW | enabled | public.validate_sicoob_approval_delegate_role |


## Grants

_nenhum_
