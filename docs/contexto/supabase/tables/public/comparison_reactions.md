# public.comparison_reactions

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
| 2 | `comparison_id` | `uuid` | não |  |  |  |
| 3 | `item_index` | `integer` | não | `0` |  |  |
| 4 | `emoji` | `text` | não |  |  |  |
| 5 | `anon_id` | `text` | não |  |  |  |
| 6 | `ip_hash` | `text` | sim |  |  |  |
| 7 | `user_agent` | `text` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| comparison_reactions_comparison_id_fkey | FOREIGN KEY | `FOREIGN KEY (comparison_id) REFERENCES user_comparisons(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| comparison_reactions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| comparison_reactions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX comparison_reactions_pkey ON public.comparison_reactions USING btree (id)` |
| idx_comparison_reactions_comp | btree | comparison_id, created_at | não | sim |  | `CREATE INDEX idx_comparison_reactions_comp ON public.comparison_reactions USING btree (comparison_id, created_at DESC)` |
| uq_comparison_reactions_anon | btree | comparison_id, item_index, emoji, anon_id | sim | sim |  | `CREATE UNIQUE INDEX uq_comparison_reactions_anon ON public.comparison_reactions USING btree (comparison_id, item_index, emoji, anon_id)` |


## Policies (RLS)

### `anyone_read_comparison_reactions`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM user_comparisons uc   WHERE ((uc.id = comparison_reactions.comparison_id) AND (uc.is_public = true) AND ((uc.share_expires_at IS NULL) OR (uc.share_expires_at > now())))))` |
| WITH CHECK |  |

### `no_direct_insert_reactions`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `false` |


## Triggers

_nenhum_


## Grants

_nenhum_
