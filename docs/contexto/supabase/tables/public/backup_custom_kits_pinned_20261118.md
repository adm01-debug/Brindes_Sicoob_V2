# public._backup_custom_kits_pinned_20261118

> Estado de is_pinned/last_used_at/updated_at dos kits fixados imediatamente antes de 20261118130400_pin_custom_kit_atomically. RLS habilitada sem policy: somente superusuario e o owner da tabela leem.

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
| 1 | `id` | `uuid` | não |  |  |  |
| 2 | `user_id` | `uuid` | sim |  |  |  |
| 3 | `is_pinned` | `boolean` | sim |  |  |  |
| 4 | `last_used_at` | `timestamp with time zone` | sim |  |  |  |
| 5 | `updated_at` | `timestamp with time zone` | sim |  |  |  |
| 6 | `backed_up_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| _backup_custom_kits_pinned_20261118_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| _backup_custom_kits_pinned_20261118_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX _backup_custom_kits_pinned_20261118_pkey ON public._backup_custom_kits_pinned_20261118 USING btree (id)` |


## Policies (RLS)

### `deny_non_service_role`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | RESTRICTIVE |
| roles | public |
| USING | `false` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
