# public.ip_access_control

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `ip_address` | `text` | não |  |  |  |
| 3 | `list_type` | `text` | não |  |  |  |
| 4 | `reason` | `text` | sim |  |  |  |
| 5 | `expires_at` | `timestamp with time zone` | sim |  |  |  |
| 6 | `created_by` | `uuid` | não |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ip_access_control_ip_address_key | UNIQUE | `UNIQUE (ip_address)` |  |  | sim |
| ip_access_control_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_ip_access_control_ip | btree | ip_address | não | sim |  | `CREATE INDEX idx_ip_access_control_ip ON public.ip_access_control USING btree (ip_address)` |
| idx_ip_access_control_type_expires | btree | list_type, expires_at | não | sim |  | `CREATE INDEX idx_ip_access_control_type_expires ON public.ip_access_control USING btree (list_type, expires_at)` |
| ip_access_control_ip_address_key | btree | ip_address | sim | sim |  | `CREATE UNIQUE INDEX ip_access_control_ip_address_key ON public.ip_access_control USING btree (ip_address)` |
| ip_access_control_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ip_access_control_pkey ON public.ip_access_control USING btree (id)` |


## Policies (RLS)

### `Devs can manage ip_access_control`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_dev(( SELECT auth.uid() AS uid))` |
| WITH CHECK | `is_dev(( SELECT auth.uid() AS uid))` |

### `Service role full access ip_access_control`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | service_role |
| USING | `true` |
| WITH CHECK | `true` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_ip_access_control_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| trg_validate_ip_access_control | BEFORE | INSERT OR UPDATE | ROW | enabled | public.validate_ip_access_control |


## Grants

_nenhum_
