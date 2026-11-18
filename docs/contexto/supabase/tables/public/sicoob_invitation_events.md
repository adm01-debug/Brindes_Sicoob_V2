# public.sicoob_invitation_events

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
| 2 | `invitation_id` | `uuid` | sim |  |  |  |
| 3 | `cooperative_id` | `uuid` | não |  |  |  |
| 4 | `action` | `text` | não |  |  |  |
| 5 | `actor_id` | `uuid` | não |  |  |  |
| 6 | `target_user_id` | `uuid` | sim |  |  |  |
| 7 | `details` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sicoob_invitation_events_action_check | CHECK | `CHECK (action = ANY (ARRAY['issued'::text, 'superseded'::text, 'accepted'::text, 'revoked'::text, 'access_revoked'::text]))` |  |  | sim |
| sicoob_invitation_events_actor_id_fkey | FOREIGN KEY | `FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| sicoob_invitation_events_cooperative_id_fkey | FOREIGN KEY | `FOREIGN KEY (cooperative_id) REFERENCES cooperativas(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| sicoob_invitation_events_invitation_id_fkey | FOREIGN KEY | `FOREIGN KEY (invitation_id) REFERENCES sicoob_invitations(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| sicoob_invitation_events_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sicoob_invitation_events_target_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (target_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sicoob_invitation_events_actor_id | btree | actor_id | não | sim |  | `CREATE INDEX idx_sicoob_invitation_events_actor_id ON public.sicoob_invitation_events USING btree (actor_id)` |
| idx_sicoob_invitation_events_cooperative_id | btree | cooperative_id | não | sim |  | `CREATE INDEX idx_sicoob_invitation_events_cooperative_id ON public.sicoob_invitation_events USING btree (cooperative_id)` |
| idx_sicoob_invitation_events_invitation_id | btree | invitation_id | não | sim |  | `CREATE INDEX idx_sicoob_invitation_events_invitation_id ON public.sicoob_invitation_events USING btree (invitation_id)` |
| idx_sicoob_invitation_events_target_user_id | btree | target_user_id | não | sim |  | `CREATE INDEX idx_sicoob_invitation_events_target_user_id ON public.sicoob_invitation_events USING btree (target_user_id)` |
| sicoob_invitation_events_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sicoob_invitation_events_pkey ON public.sicoob_invitation_events USING btree (id)` |


## Policies (RLS)

### `sicoob_invitation_events_authorized_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((actor_id = ( SELECT auth.uid() AS uid)) OR (target_user_id = ( SELECT auth.uid() AS uid)) OR is_admin(( SELECT auth.uid() AS uid)) OR sicoob_current_actor_can_issue_invitation(cooperative_id, 'vendedor'::app_role) OR (EXISTS ( SELECT 1    FROM sicoob_invitations i   WHERE ((i.id = sicoob_invitation_events.invitation_id) AND sicoob_current_actor_can_issue_invitation(i.cooperative_id, i.role)))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_sicoob_invitation_events_immutable | BEFORE | DELETE OR UPDATE | ROW | enabled | public.reject_sicoob_invitation_event_mutation |


## Grants

_nenhum_
