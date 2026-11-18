# public.favorite_item_reactions

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
| 2 | `item_id` | `uuid` | não |  |  |  |
| 3 | `list_id` | `uuid` | não |  |  |  |
| 4 | `anon_id` | `text` | não |  |  |  |
| 5 | `emoji` | `text` | não |  |  |  |
| 6 | `ip_hash` | `text` | sim |  |  |  |
| 7 | `user_agent` | `text` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| favorite_item_reactions_emoji_check | CHECK | `CHECK (emoji = ANY (ARRAY['👍'::text, '❤️'::text, '🔥'::text, '💡'::text]))` |  |  | sim |
| favorite_item_reactions_item_id_anon_id_emoji_key | UNIQUE | `UNIQUE (item_id, anon_id, emoji)` |  |  | sim |
| favorite_item_reactions_item_id_fkey | FOREIGN KEY | `FOREIGN KEY (item_id) REFERENCES favorite_items(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| favorite_item_reactions_list_id_fkey | FOREIGN KEY | `FOREIGN KEY (list_id) REFERENCES favorite_lists(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| favorite_item_reactions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| favorite_item_reactions_item_id_anon_id_emoji_key | btree | item_id, anon_id, emoji | sim | sim |  | `CREATE UNIQUE INDEX favorite_item_reactions_item_id_anon_id_emoji_key ON public.favorite_item_reactions USING btree (item_id, anon_id, emoji)` |
| favorite_item_reactions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX favorite_item_reactions_pkey ON public.favorite_item_reactions USING btree (id)` |
| idx_favorite_reactions_created | btree | created_at | não | sim |  | `CREATE INDEX idx_favorite_reactions_created ON public.favorite_item_reactions USING btree (created_at DESC)` |
| idx_favorite_reactions_item | btree | item_id | não | sim |  | `CREATE INDEX idx_favorite_reactions_item ON public.favorite_item_reactions USING btree (item_id)` |
| idx_favorite_reactions_list | btree | list_id | não | sim |  | `CREATE INDEX idx_favorite_reactions_list ON public.favorite_item_reactions USING btree (list_id)` |


## Policies (RLS)

### `favorite_reactions_owner_admin_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((EXISTS ( SELECT 1    FROM favorite_lists owned_list   WHERE ((owned_list.id = favorite_item_reactions.list_id) AND (owned_list.user_id = ( SELECT auth.uid() AS uid))))) OR is_admin(auth.uid()))` |
| WITH CHECK |  |

### `sicoob_merged_d84198073aadc4bd_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (EXISTS ( SELECT 1    FROM favorite_lists l   WHERE ((l.id = favorite_item_reactions.list_id) AND (l.user_id = ( SELECT auth.uid() AS uid))))))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
