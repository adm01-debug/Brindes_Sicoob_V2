# public.integration_credentials

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | sim |
| replica identity | full |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `secret_name` | `text` | não |  |  |  |
| 3 | `secret_value` | `text` | não |  |  |  |
| 4 | `masked_suffix` | `text` | sim |  |  |  |
| 5 | `length` | `integer` | sim |  |  |  |
| 6 | `notes` | `text` | sim |  |  |  |
| 7 | `updated_by` | `uuid` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| integration_credentials_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| integration_credentials_secret_name_key | UNIQUE | `UNIQUE (secret_name)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_integration_credentials_name | btree | secret_name | não | sim |  | `CREATE INDEX idx_integration_credentials_name ON public.integration_credentials USING btree (secret_name)` |
| integration_credentials_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX integration_credentials_pkey ON public.integration_credentials USING btree (id)` |
| integration_credentials_secret_name_key | btree | secret_name | sim | sim |  | `CREATE UNIQUE INDEX integration_credentials_secret_name_key ON public.integration_credentials USING btree (secret_name)` |


## Policies (RLS)

### `Admins can delete integration credentials`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin(( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |

### `Admins can insert integration credentials`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_admin(( SELECT auth.uid() AS uid))` |

### `Admins can update integration credentials`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin(( SELECT auth.uid() AS uid))` |
| WITH CHECK | `is_admin(( SELECT auth.uid() AS uid))` |

### `Admins can view integration credentials`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin(( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| sync_external_connections_on_credential_change | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.trg_sync_external_connections |
| trg_fill_integration_credential_metadata | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fill_integration_credential_metadata |


## Grants

_nenhum_
