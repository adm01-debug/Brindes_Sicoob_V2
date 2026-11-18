# public.magic_up_public_shares

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
| 3 | `generation_id` | `uuid` | sim |  |  |  |
| 4 | `campaign_id` | `uuid` | sim |  |  |  |
| 5 | `share_token` | `text` | não | `encode(gen_random_bytes(24), 'hex'::text)` |  |  |
| 6 | `expires_at` | `timestamp with time zone` | sim |  |  |  |
| 7 | `allow_download` | `boolean` | não | `true` |  |  |
| 8 | `allow_comments` | `boolean` | não | `true` |  |  |
| 9 | `status` | `text` | não | `'active'::text` |  |  |
| 10 | `metadata` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| magic_up_public_shares_campaign_id_fkey | FOREIGN KEY | `FOREIGN KEY (campaign_id) REFERENCES magic_up_campaigns(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| magic_up_public_shares_generation_id_fkey | FOREIGN KEY | `FOREIGN KEY (generation_id) REFERENCES magic_up_generations(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| magic_up_public_shares_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| magic_up_public_shares_share_token_key | UNIQUE | `UNIQUE (share_token)` |  |  | sim |
| magic_up_public_shares_target_check | CHECK | `CHECK (generation_id IS NOT NULL OR campaign_id IS NOT NULL)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_magic_up_public_shares_campaign_id | btree | campaign_id | não | sim |  | `CREATE INDEX idx_magic_up_public_shares_campaign_id ON public.magic_up_public_shares USING btree (campaign_id)` |
| idx_magic_up_public_shares_generation_id | btree | generation_id | não | sim |  | `CREATE INDEX idx_magic_up_public_shares_generation_id ON public.magic_up_public_shares USING btree (generation_id)` |
| idx_magic_up_public_shares_token | btree | share_token | não | sim |  | `CREATE INDEX idx_magic_up_public_shares_token ON public.magic_up_public_shares USING btree (share_token)` |
| magic_up_public_shares_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX magic_up_public_shares_pkey ON public.magic_up_public_shares USING btree (id)` |
| magic_up_public_shares_share_token_key | btree | share_token | sim | sim |  | `CREATE UNIQUE INDEX magic_up_public_shares_share_token_key ON public.magic_up_public_shares USING btree (share_token)` |


## Policies (RLS)

### `Users can create own Magic Up public shares`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(( SELECT auth.uid() AS uid) = user_id)` |

### `Users can delete own Magic Up public shares`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK |  |

### `Users can update own Magic Up public shares`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK | `(( SELECT auth.uid() AS uid) = user_id)` |

### `Users can view own Magic Up public shares`

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
| set_magic_up_public_shares_updated_at | BEFORE | UPDATE | ROW | enabled | public.set_magic_up_updated_at |
| trg_owner__magic_up_public_shares__user_id | BEFORE | INSERT | ROW | enabled | public.enforce_user_id_owner |


## Grants

_nenhum_
