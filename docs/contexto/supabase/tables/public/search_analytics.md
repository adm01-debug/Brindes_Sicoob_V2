# public.search_analytics

> Telemetria imutável de buscas: authenticated possui apenas SELECT/INSERT sujeitos à RLS.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | sim |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `user_id` | `uuid` | sim |  |  | Usuário autenticado que originou a busca; protegido por RLS contra atribuição a terceiros. |
| 3 | `search_term` | `text` | não |  |  |  |
| 4 | `results_count` | `integer` | não | `0` |  |  |
| 5 | `search_context` | `text` | sim |  |  | Filtros da busca serializados em JSON textual pelo cliente. |
| 6 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `seller_id` | `uuid` | sim |  |  | Campo legado mantido temporariamente; em inserts autenticados é normalizado para auth.uid(). |
| 8 | `filters_used` | `jsonb` | sim |  |  | Campo legado mantido temporariamente; seu JSON é copiado para search_context quando o campo canônico não é enviado. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| search_analytics_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| search_analytics_results_count_nonnegative | CHECK | `CHECK (results_count >= 0)` |  |  | sim |
| search_analytics_search_context_valid | CHECK | `CHECK (search_context IS NULL OR search_context IS JSON OBJECT AND octet_length(search_context) <= 32768)` |  |  | sim |
| search_analytics_search_term_valid | CHECK | `CHECK (search_term = btrim(search_term) AND length(search_term) >= 1 AND length(search_term) <= 500)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_search_analytics_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_search_analytics_created_at ON public.search_analytics USING btree (created_at DESC)` |
| idx_search_analytics_created_id | btree | created_at, id | não | sim |  | `CREATE INDEX idx_search_analytics_created_id ON public.search_analytics USING btree (created_at DESC, id DESC)` |
| idx_search_analytics_term_lower | btree |  | não | sim |  | `CREATE INDEX idx_search_analytics_term_lower ON public.search_analytics USING btree (lower(search_term))` |
| idx_search_analytics_user_created_id | btree | user_id, created_at, id | não | sim |  | `CREATE INDEX idx_search_analytics_user_created_id ON public.search_analytics USING btree (user_id, created_at DESC, id DESC)` |
| idx_search_analytics_zero_results | btree | created_at | não | sim | `(results_count = 0)` | `CREATE INDEX idx_search_analytics_zero_results ON public.search_analytics USING btree (created_at DESC) WHERE (results_count = 0)` |
| idx_search_analytics_zero_results_created_id | btree | created_at, id | não | sim | `(results_count = 0)` | `CREATE INDEX idx_search_analytics_zero_results_created_id ON public.search_analytics USING btree (created_at DESC, id DESC) WHERE (results_count = 0)` |
| search_analytics_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX search_analytics_pkey ON public.search_analytics USING btree (id)` |


## Policies (RLS)

### `Authorized users read search analytics`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((( SELECT auth.uid() AS uid) IS NOT NULL) AND ((( SELECT auth.uid() AS uid) = user_id) OR ( SELECT is_manager_or_admin() AS is_manager_or_admin)))` |
| WITH CHECK |  |

### `Users insert own search analytics`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_normalize_search_analytics_insert | BEFORE | INSERT | ROW | enabled | public.normalize_search_analytics_insert |


## Grants

_nenhum_
