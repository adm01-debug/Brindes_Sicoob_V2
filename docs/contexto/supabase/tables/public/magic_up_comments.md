# public.magic_up_comments

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
| 3 | `generation_id` | `uuid` | não |  |  |  |
| 4 | `author_name` | `text` | não | `'Cliente'::text` |  |  |
| 5 | `comment` | `text` | não |  |  |  |
| 6 | `is_public` | `boolean` | não | `true` |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| magic_up_comments_generation_id_fkey | FOREIGN KEY | `FOREIGN KEY (generation_id) REFERENCES magic_up_generations(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| magic_up_comments_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_magic_up_comments_generation | btree | generation_id, created_at | não | sim |  | `CREATE INDEX idx_magic_up_comments_generation ON public.magic_up_comments USING btree (generation_id, created_at DESC)` |
| magic_up_comments_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX magic_up_comments_pkey ON public.magic_up_comments USING btree (id)` |


## Policies (RLS)

### `Users can create comments on own Magic Up generations`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((( SELECT auth.uid() AS uid) = user_id) AND (EXISTS ( SELECT 1    FROM magic_up_generations g   WHERE ((g.id = magic_up_comments.generation_id) AND (g.user_id = ( SELECT auth.uid() AS uid))))))` |

### `Users can delete comments on own Magic Up generations`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK |  |

### `Users can update comments on own Magic Up generations`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK | `(( SELECT auth.uid() AS uid) = user_id)` |

### `Users can view comments on own Magic Up generations`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_owner__magic_up_comments__user_id | BEFORE | INSERT | ROW | enabled | public.enforce_user_id_owner |


## Grants

_nenhum_
