# public.cost_centers

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
| 2 | `cooperativa_id` | `uuid` | não |  |  |  |
| 3 | `codigo` | `text` | não |  |  |  |
| 4 | `nome` | `text` | não |  |  |  |
| 5 | `ativo` | `boolean` | não | `true` |  |  |
| 6 | `observacoes` | `text` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| cost_centers_codigo_nao_vazio | CHECK | `CHECK (btrim(codigo) <> ''::text)` |  |  | sim |
| cost_centers_coop_codigo_uk | UNIQUE | `UNIQUE (cooperativa_id, codigo)` |  |  | sim |
| cost_centers_cooperativa_id_fkey | FOREIGN KEY | `FOREIGN KEY (cooperativa_id) REFERENCES cooperativas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| cost_centers_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.pa_budget_allocations | pa_budget_allocations_cost_center_id_fkey | cost_center_id | RESTRICT |
| public.pa_budget_entries | pa_budget_entries_cost_center_id_fkey | cost_center_id | SET NULL |
| public.pa_budgets | pa_budgets_cost_center_id_fkey | cost_center_id | SET NULL |
| public.sicoob_orders | sicoob_orders_cost_center_id_fkey | cost_center_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| cost_centers_coop_codigo_uk | btree | cooperativa_id, codigo | sim | sim |  | `CREATE UNIQUE INDEX cost_centers_coop_codigo_uk ON public.cost_centers USING btree (cooperativa_id, codigo)` |
| cost_centers_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX cost_centers_pkey ON public.cost_centers USING btree (id)` |
| idx_cost_centers_coop | btree | cooperativa_id | não | sim | `ativo` | `CREATE INDEX idx_cost_centers_coop ON public.cost_centers USING btree (cooperativa_id) WHERE ativo` |


## Policies (RLS)

### `cost_centers_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `user_can_access_cooperativa(cooperativa_id)` |
| WITH CHECK |  |

### `cost_centers_write`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(is_admin(( SELECT auth.uid() AS uid)) OR ((is_gestor_compras() OR user_is_comprador_singular()) AND user_can_access_cooperativa(cooperativa_id)))` |
| WITH CHECK | `(is_admin(( SELECT auth.uid() AS uid)) OR ((is_gestor_compras() OR user_is_comprador_singular()) AND user_can_access_cooperativa(cooperativa_id)))` |


## Triggers

_nenhum_


## Grants

_nenhum_
