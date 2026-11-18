# public.expert_conversations

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
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `seller_id` | `uuid` | não |  |  |  |
| 3 | `client_id` | `text` | sim |  |  |  |
| 4 | `title` | `text` | não | `'Nova Conversa'::text` |  |  |
| 5 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 6 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| expert_conversations_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| expert_conversations_seller_id_fkey | FOREIGN KEY | `FOREIGN KEY (seller_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.expert_messages | expert_messages_conversation_id_fkey | conversation_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| expert_conversations_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX expert_conversations_pkey ON public.expert_conversations USING btree (id)` |
| idx_expert_conversations_seller_id | btree | seller_id | não | sim |  | `CREATE INDEX idx_expert_conversations_seller_id ON public.expert_conversations USING btree (seller_id)` |


## Policies (RLS)

### `Users can manage own conversations`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(seller_id = ( SELECT auth.uid() AS uid))` |
| WITH CHECK | `(seller_id = ( SELECT auth.uid() AS uid))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_owner__expert_conversations__seller_id | BEFORE | INSERT | ROW | enabled | public.enforce_seller_id_owner |


## Grants

_nenhum_
