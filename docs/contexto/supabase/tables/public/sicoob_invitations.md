# public.sicoob_invitations

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | sim |
| policies | 1 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `token_hash` | `bytea` | não |  |  |  |
| 3 | `email` | `text` | não |  |  |  |
| 4 | `cooperative_id` | `uuid` | não |  |  |  |
| 5 | `pa_id` | `uuid` | sim |  |  |  |
| 6 | `role` | `app_role` | não |  |  |  |
| 7 | `status` | `text` | não | `'pending'::text` |  |  |
| 8 | `expires_at` | `timestamp with time zone` | não |  |  |  |
| 9 | `invited_by` | `uuid` | não |  |  |  |
| 10 | `accepted_by` | `uuid` | sim |  |  |  |
| 11 | `accepted_at` | `timestamp with time zone` | sim |  |  |  |
| 12 | `revoked_by` | `uuid` | sim |  |  |  |
| 13 | `revoked_at` | `timestamp with time zone` | sim |  |  |  |
| 14 | `access_revoked_by` | `uuid` | sim |  |  |  |
| 15 | `access_revoked_at` | `timestamp with time zone` | sim |  |  |  |
| 16 | `superseded_by` | `uuid` | sim |  |  |  |
| 17 | `idempotency_key` | `uuid` | não |  |  |  |
| 18 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 19 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sicoob_invitations_acceptance_consistent | CHECK | `CHECK ((status = 'accepted'::text) = (accepted_by IS NOT NULL AND accepted_at IS NOT NULL))` |  |  | sim |
| sicoob_invitations_accepted_by_fkey | FOREIGN KEY | `FOREIGN KEY (accepted_by) REFERENCES auth.users(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| sicoob_invitations_access_revoked_by_fkey | FOREIGN KEY | `FOREIGN KEY (access_revoked_by) REFERENCES auth.users(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| sicoob_invitations_cooperative_id_fkey | FOREIGN KEY | `FOREIGN KEY (cooperative_id) REFERENCES cooperativas(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| sicoob_invitations_email_normalized | CHECK | `CHECK (email = lower(TRIM(BOTH FROM email)) AND email ~ '^[^@[:space:]]+@[^@[:space:]]+$'::text)` |  |  | sim |
| sicoob_invitations_expiry_after_creation | CHECK | `CHECK (expires_at > created_at)` |  |  | sim |
| sicoob_invitations_invited_by_fkey | FOREIGN KEY | `FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| sicoob_invitations_invited_by_idempotency_key_key | UNIQUE | `UNIQUE (invited_by, idempotency_key)` |  |  | sim |
| sicoob_invitations_pa_id_fkey | FOREIGN KEY | `FOREIGN KEY (pa_id) REFERENCES postos_atendimento(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| sicoob_invitations_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sicoob_invitations_revocation_consistent | CHECK | `CHECK ((status = 'revoked'::text) = (revoked_by IS NOT NULL AND revoked_at IS NOT NULL))` |  |  | sim |
| sicoob_invitations_revoked_by_fkey | FOREIGN KEY | `FOREIGN KEY (revoked_by) REFERENCES auth.users(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| sicoob_invitations_status_check | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'revoked'::text, 'superseded'::text]))` |  |  | sim |
| sicoob_invitations_superseded_by_fkey | FOREIGN KEY | `FOREIGN KEY (superseded_by) REFERENCES sicoob_invitations(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| sicoob_invitations_token_hash_key | UNIQUE | `UNIQUE (token_hash)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.sicoob_invitation_events | sicoob_invitation_events_invitation_id_fkey | invitation_id | RESTRICT |
| public.sicoob_invitations | sicoob_invitations_superseded_by_fkey | superseded_by | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sicoob_invitations_accepted_by | btree | accepted_by | não | sim |  | `CREATE INDEX idx_sicoob_invitations_accepted_by ON public.sicoob_invitations USING btree (accepted_by)` |
| idx_sicoob_invitations_access_revoked_by | btree | access_revoked_by | não | sim |  | `CREATE INDEX idx_sicoob_invitations_access_revoked_by ON public.sicoob_invitations USING btree (access_revoked_by)` |
| idx_sicoob_invitations_cooperative_id | btree | cooperative_id | não | sim |  | `CREATE INDEX idx_sicoob_invitations_cooperative_id ON public.sicoob_invitations USING btree (cooperative_id)` |
| idx_sicoob_invitations_invited_by | btree | invited_by | não | sim |  | `CREATE INDEX idx_sicoob_invitations_invited_by ON public.sicoob_invitations USING btree (invited_by)` |
| idx_sicoob_invitations_pa_id | btree | pa_id | não | sim |  | `CREATE INDEX idx_sicoob_invitations_pa_id ON public.sicoob_invitations USING btree (pa_id)` |
| idx_sicoob_invitations_pending_expiry | btree | expires_at | não | sim | `(status = 'pending'::text)` | `CREATE INDEX idx_sicoob_invitations_pending_expiry ON public.sicoob_invitations USING btree (expires_at) WHERE (status = 'pending'::text)` |
| idx_sicoob_invitations_revoked_by | btree | revoked_by | não | sim |  | `CREATE INDEX idx_sicoob_invitations_revoked_by ON public.sicoob_invitations USING btree (revoked_by)` |
| idx_sicoob_invitations_superseded_by | btree | superseded_by | não | sim |  | `CREATE INDEX idx_sicoob_invitations_superseded_by ON public.sicoob_invitations USING btree (superseded_by)` |
| sicoob_invitations_invited_by_idempotency_key_key | btree | invited_by, idempotency_key | sim | sim |  | `CREATE UNIQUE INDEX sicoob_invitations_invited_by_idempotency_key_key ON public.sicoob_invitations USING btree (invited_by, idempotency_key)` |
| sicoob_invitations_one_pending_scope | btree | email, cooperative_id, role | sim | sim | `(status = 'pending'::text)` | `CREATE UNIQUE INDEX sicoob_invitations_one_pending_scope ON public.sicoob_invitations USING btree (email, cooperative_id, COALESCE(pa_id, '00000000-0000-0000-0000-000000000000'::uuid), role) WHERE (status = 'pending'::text)` |
| sicoob_invitations_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sicoob_invitations_pkey ON public.sicoob_invitations USING btree (id)` |
| sicoob_invitations_token_hash_key | btree | token_hash | sim | sim |  | `CREATE UNIQUE INDEX sicoob_invitations_token_hash_key ON public.sicoob_invitations USING btree (token_hash)` |


## Policies (RLS)

### `sicoob_invitations_authorized_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((invited_by = ( SELECT auth.uid() AS uid)) OR (accepted_by = ( SELECT auth.uid() AS uid)) OR is_admin(( SELECT auth.uid() AS uid)) OR sicoob_current_actor_can_issue_invitation(cooperative_id, role))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_sicoob_invitation_existing_account | BEFORE | INSERT | ROW | enabled | public.require_sicoob_invitation_account |


## Grants

_nenhum_
