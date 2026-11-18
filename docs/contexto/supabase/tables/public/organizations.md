# public.organizations

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `name` | `text` | não |  |  |  |
| 3 | `slug` | `text` | não |  |  |  |
| 4 | `logo_url` | `text` | sim |  |  |  |
| 5 | `description` | `text` | sim |  |  |  |
| 6 | `is_active` | `boolean` | não | `true` |  |  |
| 7 | `settings` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| organizations_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| organizations_slug_key | UNIQUE | `UNIQUE (slug)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.order_items | order_items_organization_id_fkey | organization_id | NO ACTION |
| public.orders | orders_organization_id_fkey | organization_id | NO ACTION |
| public.organization_members | organization_members_organization_id_fkey | organization_id | CASCADE |
| public.quotes | quotes_organization_id_fkey | organization_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| organizations_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX organizations_pkey ON public.organizations USING btree (id)` |
| organizations_slug_key | btree | slug | sim | sim |  | `CREATE UNIQUE INDEX organizations_slug_key ON public.organizations USING btree (slug)` |


## Policies (RLS)

### `Authenticated users can create organizations`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(( SELECT auth.uid() AS uid) IS NOT NULL)` |

### `Members can view their organizations`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(id IN ( SELECT get_user_org_ids(( SELECT auth.uid() AS uid)) AS get_user_org_ids))` |
| WITH CHECK |  |

### `Owners can update their organization`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_org_role(( SELECT auth.uid() AS uid), id, 'owner'::org_role)` |
| WITH CHECK | `has_org_role(( SELECT auth.uid() AS uid), id, 'owner'::org_role)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_organizations_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
