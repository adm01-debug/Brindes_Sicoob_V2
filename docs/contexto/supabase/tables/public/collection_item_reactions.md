# public.collection_item_reactions

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
| 2 | `collection_id` | `uuid` | não |  |  |  |
| 3 | `item_id` | `uuid` | não |  |  |  |
| 4 | `anon_id` | `text` | não |  |  |  |
| 5 | `emoji` | `text` | não |  |  |  |
| 6 | `ip_hash` | `text` | sim |  |  |  |
| 7 | `user_agent` | `text` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| collection_item_reactions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| collection_item_reactions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX collection_item_reactions_pkey ON public.collection_item_reactions USING btree (id)` |
| idx_collection_reactions_collection | btree | collection_id | não | sim |  | `CREATE INDEX idx_collection_reactions_collection ON public.collection_item_reactions USING btree (collection_id)` |
| idx_collection_reactions_item | btree | item_id | não | sim |  | `CREATE INDEX idx_collection_reactions_item ON public.collection_item_reactions USING btree (item_id)` |
| uq_collection_reactions_anon | btree | item_id, anon_id, emoji | sim | sim |  | `CREATE UNIQUE INDEX uq_collection_reactions_anon ON public.collection_item_reactions USING btree (item_id, anon_id, emoji)` |


## Policies (RLS)

### `Public can view reactions for public collections`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((EXISTS ( SELECT 1    FROM collections c   WHERE ((c.id = collection_item_reactions.collection_id) AND (c.is_public = true) AND (c.share_token IS NOT NULL) AND ((c.share_expires_at IS NULL) OR (c.share_expires_at > now()))))) OR (EXISTS ( SELECT 1    FROM collections c   WHERE ((c.id = collection_item_reactions.collection_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))))` |
| WITH CHECK |  |

### `Service role inserts reactions`

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
