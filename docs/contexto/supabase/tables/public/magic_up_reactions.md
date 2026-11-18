# public.magic_up_reactions

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
| 4 | `reaction_type` | `text` | não |  |  |  |
| 5 | `ip_hash` | `text` | sim |  |  |  |
| 6 | `user_agent` | `text` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| magic_up_reactions_generation_id_fkey | FOREIGN KEY | `FOREIGN KEY (generation_id) REFERENCES magic_up_generations(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| magic_up_reactions_generation_id_reaction_type_ip_hash_key | UNIQUE | `UNIQUE (generation_id, reaction_type, ip_hash)` |  |  | sim |
| magic_up_reactions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_magic_up_reactions_generation | btree | generation_id, created_at | não | sim |  | `CREATE INDEX idx_magic_up_reactions_generation ON public.magic_up_reactions USING btree (generation_id, created_at DESC)` |
| magic_up_reactions_generation_id_reaction_type_ip_hash_key | btree | generation_id, reaction_type, ip_hash | sim | sim |  | `CREATE UNIQUE INDEX magic_up_reactions_generation_id_reaction_type_ip_hash_key ON public.magic_up_reactions USING btree (generation_id, reaction_type, ip_hash)` |
| magic_up_reactions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX magic_up_reactions_pkey ON public.magic_up_reactions USING btree (id)` |


## Policies (RLS)

### `Users can create reactions on own Magic Up generations`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((( SELECT auth.uid() AS uid) = user_id) AND (EXISTS ( SELECT 1    FROM magic_up_generations g   WHERE ((g.id = magic_up_reactions.generation_id) AND (g.user_id = ( SELECT auth.uid() AS uid))))))` |

### `Users can delete reactions on own Magic Up generations`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK |  |

### `Users can update reactions on own Magic Up generations`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK | `(( SELECT auth.uid() AS uid) = user_id)` |

### `Users can view reactions on own Magic Up generations`

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
| trg_owner__magic_up_reactions__user_id | BEFORE | INSERT | ROW | enabled | public.enforce_user_id_owner |


## Grants

_nenhum_
