# public.magic_up_campaigns

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
| 3 | `client_id` | `text` | sim |  |  |  |
| 4 | `client_name` | `text` | sim |  |  |  |
| 5 | `title` | `text` | não | `'Campanha Magic Up'::text` |  |  |
| 6 | `objective` | `text` | sim |  |  |  |
| 7 | `channel` | `text` | sim |  |  |  |
| 8 | `audience` | `text` | sim |  |  |  |
| 9 | `tone` | `text` | sim |  |  |  |
| 10 | `cta` | `text` | sim |  |  |  |
| 11 | `occasion` | `text` | sim |  |  |  |
| 12 | `status` | `text` | não | `'draft'::text` |  |  |
| 13 | `metadata` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 14 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| magic_up_campaigns_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.magic_up_generations | magic_up_generations_campaign_id_fkey | campaign_id | SET NULL |
| public.magic_up_public_shares | magic_up_public_shares_campaign_id_fkey | campaign_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_magic_up_campaigns_user_status | btree | user_id, status, created_at | não | sim |  | `CREATE INDEX idx_magic_up_campaigns_user_status ON public.magic_up_campaigns USING btree (user_id, status, created_at DESC)` |
| magic_up_campaigns_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX magic_up_campaigns_pkey ON public.magic_up_campaigns USING btree (id)` |


## Policies (RLS)

### `Users can create own Magic Up campaigns`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(( SELECT auth.uid() AS uid) = user_id)` |

### `Users can delete own Magic Up campaigns`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK |  |

### `Users can update own Magic Up campaigns`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK | `(( SELECT auth.uid() AS uid) = user_id)` |

### `Users can view own Magic Up campaigns`

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
| set_magic_up_campaigns_updated_at | BEFORE | UPDATE | ROW | enabled | public.set_magic_up_updated_at |
| trg_owner__magic_up_campaigns__user_id | BEFORE | INSERT | ROW | enabled | public.enforce_user_id_owner |


## Grants

_nenhum_
