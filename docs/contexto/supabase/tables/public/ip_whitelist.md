# public.ip_whitelist

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
| 2 | `ip_address` | `text` | não |  |  |  |
| 3 | `label` | `text` | sim |  |  |  |
| 4 | `is_active` | `boolean` | não | `true` |  |  |
| 5 | `created_by` | `uuid` | sim |  |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ip_whitelist_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| ip_whitelist_ip_address_key | UNIQUE | `UNIQUE (ip_address)` |  |  | sim |
| ip_whitelist_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_ip_whitelist_active | btree | is_active | não | sim | `(is_active = true)` | `CREATE INDEX idx_ip_whitelist_active ON public.ip_whitelist USING btree (is_active) WHERE (is_active = true)` |
| idx_ip_whitelist_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_ip_whitelist_created_by ON public.ip_whitelist USING btree (created_by)` |
| ip_whitelist_ip_address_key | btree | ip_address | sim | sim |  | `CREATE UNIQUE INDEX ip_whitelist_ip_address_key ON public.ip_whitelist USING btree (ip_address)` |
| ip_whitelist_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ip_whitelist_pkey ON public.ip_whitelist USING btree (id)` |


## Policies (RLS)

### `Admin manage IP whitelist`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `can_manage(( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
