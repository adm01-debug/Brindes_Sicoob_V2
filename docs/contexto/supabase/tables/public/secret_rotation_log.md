# public.secret_rotation_log

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
| 2 | `secret_name` | `text` | não |  |  |  |
| 3 | `rotated_by` | `uuid` | não |  |  |  |
| 4 | `rotated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 5 | `previous_suffix` | `text` | sim |  |  |  |
| 6 | `new_suffix` | `text` | sim |  |  |  |
| 7 | `notes` | `text` | sim |  |  |  |
| 8 | `action_type` | `text` | não | `'rotate'::text` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| secret_rotation_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_secret_rotation_log_name_time | btree | secret_name, rotated_at | não | sim |  | `CREATE INDEX idx_secret_rotation_log_name_time ON public.secret_rotation_log USING btree (secret_name, rotated_at DESC)` |
| idx_secret_rotation_log_secret_action | btree | secret_name, action_type, rotated_at | não | sim |  | `CREATE INDEX idx_secret_rotation_log_secret_action ON public.secret_rotation_log USING btree (secret_name, action_type, rotated_at DESC)` |
| secret_rotation_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX secret_rotation_log_pkey ON public.secret_rotation_log USING btree (id)` |


## Policies (RLS)

### `Admins insert secret_rotation_log`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `(is_admin(( SELECT auth.uid() AS uid)) AND (rotated_by = ( SELECT auth.uid() AS uid)))` |

### `Devs read secret_rotation_log`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_dev(( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_validate_secret_rotation_action_type | BEFORE | INSERT OR UPDATE | ROW | enabled | public.validate_secret_rotation_action_type |


## Grants

_nenhum_
