# public.e2e_cleanup_rate_limit

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 8 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `key` | `text` | não |  |  |  |
| 2 | `count` | `integer` | não | `0` |  |  |
| 3 | `window_start` | `timestamp with time zone` | não | `now()` |  |  |
| 4 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| e2e_cleanup_rate_limit_pkey | PRIMARY KEY | `PRIMARY KEY (key)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| e2e_cleanup_rate_limit_pkey | btree | key | sim | sim |  | `CREATE UNIQUE INDEX e2e_cleanup_rate_limit_pkey ON public.e2e_cleanup_rate_limit USING btree (key)` |


## Policies (RLS)

### `deny_all_delete_anon`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | anon |
| USING | `false` |
| WITH CHECK |  |

### `deny_all_delete_authenticated`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `false` |
| WITH CHECK |  |

### `deny_all_insert_anon`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | anon |
| USING |  |
| WITH CHECK | `false` |

### `deny_all_insert_authenticated`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `false` |

### `deny_all_select_anon`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon |
| USING | `false` |
| WITH CHECK |  |

### `deny_all_select_authenticated`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `false` |
| WITH CHECK |  |

### `deny_all_update_anon`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | anon |
| USING | `false` |
| WITH CHECK | `false` |

### `deny_all_update_authenticated`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `false` |
| WITH CHECK | `false` |


## Triggers

_nenhum_


## Grants

_nenhum_
