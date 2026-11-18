# public.organization_members

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
| 2 | `organization_id` | `uuid` | não |  |  |  |
| 3 | `user_id` | `uuid` | não |  |  |  |
| 4 | `role` | `org_role` | não | `'member'::org_role` |  |  |
| 5 | `invited_by` | `uuid` | sim |  |  |  |
| 6 | `joined_at` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| organization_members_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| organization_members_organization_id_user_id_key | UNIQUE | `UNIQUE (organization_id, user_id)` |  |  | sim |
| organization_members_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| organization_members_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_org_members_org_id | btree | organization_id | não | sim |  | `CREATE INDEX idx_org_members_org_id ON public.organization_members USING btree (organization_id)` |
| idx_org_members_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_org_members_user_id ON public.organization_members USING btree (user_id)` |
| organization_members_organization_id_user_id_key | btree | organization_id, user_id | sim | sim |  | `CREATE UNIQUE INDEX organization_members_organization_id_user_id_key ON public.organization_members USING btree (organization_id, user_id)` |
| organization_members_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX organization_members_pkey ON public.organization_members USING btree (id)` |


## Policies (RLS)

### `Members can view org members`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(organization_id IN ( SELECT get_user_org_ids(( SELECT auth.uid() AS uid)) AS get_user_org_ids))` |
| WITH CHECK |  |

### `Org owners can delete members`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_org_role(( SELECT auth.uid() AS uid), organization_id, 'owner'::org_role) OR (user_id = ( SELECT auth.uid() AS uid)))` |
| WITH CHECK |  |

### `Org owners can insert members any role`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `has_org_role(( SELECT auth.uid() AS uid), organization_id, 'owner'::org_role)` |

### `Org owners can update members`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_org_role(( SELECT auth.uid() AS uid), organization_id, 'owner'::org_role)` |
| WITH CHECK | `has_org_role(( SELECT auth.uid() AS uid), organization_id, 'owner'::org_role)` |


## Triggers

_nenhum_


## Grants

_nenhum_
