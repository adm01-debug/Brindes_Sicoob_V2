# public.user_roles

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
| 3 | `role` | `app_role` | não | `'vendedor'::app_role` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| user_roles_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| user_roles_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| user_roles_user_id_role_key | UNIQUE | `UNIQUE (user_id, role)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_user_roles_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id)` |
| user_roles_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX user_roles_pkey ON public.user_roles USING btree (id)` |
| user_roles_user_id_role_key | btree | user_id, role | sim | sim |  | `CREATE UNIQUE INDEX user_roles_user_id_role_key ON public.user_roles USING btree (user_id, role)` |


## Policies (RLS)

### `sicoob_merged_76dc45edb8c21221_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((true AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin_strict(( SELECT auth.uid() AS uid))))` |
| WITH CHECK | `((true AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin_strict(( SELECT auth.uid() AS uid))))` |

### `sicoob_merged_9505ab133f35191c_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `((true AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin_strict(( SELECT auth.uid() AS uid))))` |

### `sicoob_merged_aef771bc27bc00a0_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((true AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (has_role(( SELECT auth.uid() AS uid), 'supervisor'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'admin'::app_role))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (user_id = ( SELECT auth.uid() AS uid))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (( SELECT auth.uid() AS uid) = user_id)))` |
| WITH CHECK |  |

### `sicoob_merged_fcd02fa3bd097efb_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((true AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin_strict(( SELECT auth.uid() AS uid))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_user_roles_audit_del | AFTER | DELETE | ROW | enabled | public.audit_user_role_changes |
| trg_user_roles_audit_ins | AFTER | INSERT | ROW | enabled | public.audit_user_role_changes |
| trg_user_roles_audit_upd | AFTER | UPDATE | ROW | enabled | public.audit_user_role_changes |
| trg_user_roles_auto_revoke_mcp | AFTER | DELETE | ROW | enabled | public.trg_auto_revoke_mcp_on_role_loss |
| trig_audit_user_roles | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.fn_audit_config_change |


## Grants

_nenhum_
