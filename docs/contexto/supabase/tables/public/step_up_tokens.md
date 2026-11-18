# public.step_up_tokens

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
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `action` | `step_up_action` | não |  |  |  |
| 4 | `target_ref` | `text` | sim |  |  |  |
| 5 | `token_hash` | `text` | não |  |  |  |
| 6 | `challenge_id` | `uuid` | não |  |  |  |
| 7 | `consumed` | `boolean` | não | `false` |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `expires_at` | `timestamp with time zone` | não | `(now() + '00:05:00'::interval)` |  |  |
| 10 | `consumed_at` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| step_up_tokens_challenge_id_fkey | FOREIGN KEY | `FOREIGN KEY (challenge_id) REFERENCES step_up_challenges(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| step_up_tokens_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| step_up_tokens_token_hash_key | UNIQUE | `UNIQUE (token_hash)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_step_up_tokens_challenge_id | btree | challenge_id | não | sim |  | `CREATE INDEX idx_step_up_tokens_challenge_id ON public.step_up_tokens USING btree (challenge_id)` |
| idx_step_up_tokens_hash | btree | token_hash | não | sim | `(consumed = false)` | `CREATE INDEX idx_step_up_tokens_hash ON public.step_up_tokens USING btree (token_hash) WHERE (consumed = false)` |
| idx_step_up_tokens_user | btree | user_id, created_at | não | sim |  | `CREATE INDEX idx_step_up_tokens_user ON public.step_up_tokens USING btree (user_id, created_at DESC)` |
| step_up_tokens_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX step_up_tokens_pkey ON public.step_up_tokens USING btree (id)` |
| step_up_tokens_token_hash_key | btree | token_hash | sim | sim |  | `CREATE UNIQUE INDEX step_up_tokens_token_hash_key ON public.step_up_tokens USING btree (token_hash)` |


## Policies (RLS)

### `Users can view own tokens`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
