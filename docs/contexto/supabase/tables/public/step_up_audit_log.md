# public.step_up_audit_log

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
| usada por views | public.v_full_scope_grants |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `user_id` | `uuid` | sim |  |  |  |
| 3 | `action` | `step_up_action` | sim |  |  |  |
| 4 | `target_ref` | `text` | sim |  |  |  |
| 5 | `event_type` | `text` | não |  |  |  |
| 6 | `challenge_id` | `uuid` | sim |  |  |  |
| 7 | `token_id` | `uuid` | sim |  |  |  |
| 8 | `ip_address` | `inet` | sim |  |  |  |
| 9 | `user_agent` | `text` | sim |  |  |  |
| 10 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| step_up_audit_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_step_up_audit_action | btree | action, created_at | não | sim |  | `CREATE INDEX idx_step_up_audit_action ON public.step_up_audit_log USING btree (action, created_at DESC)` |
| idx_step_up_audit_user | btree | user_id, created_at | não | sim |  | `CREATE INDEX idx_step_up_audit_user ON public.step_up_audit_log USING btree (user_id, created_at DESC)` |
| step_up_audit_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX step_up_audit_log_pkey ON public.step_up_audit_log USING btree (id)` |


## Policies (RLS)

### `sicoob_merged_b696474cc38b7aca_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((true AND is_dev(( SELECT auth.uid() AS uid))) OR (true AND (( SELECT auth.uid() AS uid) = user_id)))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
