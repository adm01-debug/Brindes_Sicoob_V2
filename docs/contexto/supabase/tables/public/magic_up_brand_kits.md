# public.magic_up_brand_kits

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
| 5 | `logo_urls` | `jsonb` | não | `'[]'::jsonb` |  |  |
| 6 | `primary_color` | `text` | sim |  |  |  |
| 7 | `secondary_color` | `text` | sim |  |  |  |
| 8 | `tone_of_voice` | `text` | sim |  |  |  |
| 9 | `visual_style` | `text` | sim |  |  |  |
| 10 | `required_words` | `text[]` | não | `'{}'::text[]` |  |  |
| 11 | `forbidden_words` | `text[]` | não | `'{}'::text[]` |  |  |
| 12 | `notes` | `text` | sim |  |  |  |
| 13 | `metadata` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 14 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| magic_up_brand_kits_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| magic_up_brand_kits_user_id_client_id_key | UNIQUE | `UNIQUE (user_id, client_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_magic_up_brand_kits_user_client | btree | user_id, client_id | não | sim |  | `CREATE INDEX idx_magic_up_brand_kits_user_client ON public.magic_up_brand_kits USING btree (user_id, client_id)` |
| magic_up_brand_kits_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX magic_up_brand_kits_pkey ON public.magic_up_brand_kits USING btree (id)` |
| magic_up_brand_kits_user_id_client_id_key | btree | user_id, client_id | sim | sim |  | `CREATE UNIQUE INDEX magic_up_brand_kits_user_id_client_id_key ON public.magic_up_brand_kits USING btree (user_id, client_id)` |


## Policies (RLS)

### `Users can create own Magic Up brand kits`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(( SELECT auth.uid() AS uid) = user_id)` |

### `Users can delete own Magic Up brand kits`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK |  |

### `Users can update own Magic Up brand kits`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK | `(( SELECT auth.uid() AS uid) = user_id)` |

### `Users can view own Magic Up brand kits`

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
| set_magic_up_brand_kits_updated_at | BEFORE | UPDATE | ROW | enabled | public.set_magic_up_updated_at |
| trg_owner__magic_up_brand_kits__user_id | BEFORE | INSERT | ROW | enabled | public.enforce_user_id_owner |


## Grants

_nenhum_
