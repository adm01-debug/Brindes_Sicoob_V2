# public.pa_budget_entries

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
| 2 | `pa_budget_id` | `uuid` | não |  |  |  |
| 3 | `pa_id` | `uuid` | não |  |  |  |
| 4 | `competencia_ano` | `integer` | não |  |  |  |
| 5 | `competencia_mes` | `integer` | não |  |  |  |
| 6 | `cost_center_id` | `uuid` | sim |  |  |  |
| 7 | `tipo` | `text` | não |  |  |  |
| 8 | `estado` | `text` | não |  |  |  |
| 9 | `valor` | `numeric(14,2)` | não |  |  |  |
| 10 | `order_id` | `uuid` | sim |  |  |  |
| 11 | `motivo` | `text` | sim |  |  |  |
| 12 | `actor_id` | `uuid` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| pa_budget_entries_actor_id_fkey | FOREIGN KEY | `FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| pa_budget_entries_competencia_valida | CHECK | `CHECK (competencia_mes >= 1 AND competencia_mes <= 12 AND competencia_ano >= 2024 AND competencia_ano <= 2100)` |  |  | sim |
| pa_budget_entries_cost_center_id_fkey | FOREIGN KEY | `FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| pa_budget_entries_estado_valido | CHECK | `CHECK (estado = ANY (ARRAY['reservado'::text, 'comprometido'::text, 'consumido'::text]))` |  |  | sim |
| pa_budget_entries_order_id_fkey | FOREIGN KEY | `FOREIGN KEY (order_id) REFERENCES sicoob_orders(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| pa_budget_entries_pa_budget_id_fkey | FOREIGN KEY | `FOREIGN KEY (pa_budget_id) REFERENCES pa_budgets(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| pa_budget_entries_pa_id_fkey | FOREIGN KEY | `FOREIGN KEY (pa_id) REFERENCES postos_atendimento(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| pa_budget_entries_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| pa_budget_entries_tipo_valido | CHECK | `CHECK (tipo = ANY (ARRAY['reserva'::text, 'liberacao'::text, 'compromisso'::text, 'consumo'::text, 'estorno'::text, 'ajuste'::text]))` |  |  | sim |
| pa_budget_entries_valor_nao_zero | CHECK | `CHECK (valor <> 0::numeric)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pbe_budget | btree | pa_budget_id, created_at | não | sim |  | `CREATE INDEX idx_pbe_budget ON public.pa_budget_entries USING btree (pa_budget_id, created_at DESC)` |
| idx_pbe_competencia | btree | competencia_ano, competencia_mes | não | sim |  | `CREATE INDEX idx_pbe_competencia ON public.pa_budget_entries USING btree (competencia_ano, competencia_mes)` |
| idx_pbe_estado | btree | pa_budget_id, estado | não | sim |  | `CREATE INDEX idx_pbe_estado ON public.pa_budget_entries USING btree (pa_budget_id, estado)` |
| idx_pbe_order | btree | order_id | não | sim | `(order_id IS NOT NULL)` | `CREATE INDEX idx_pbe_order ON public.pa_budget_entries USING btree (order_id) WHERE (order_id IS NOT NULL)` |
| pa_budget_entries_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX pa_budget_entries_pkey ON public.pa_budget_entries USING btree (id)` |


## Policies (RLS)

### `pa_budget_entries_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(user_can_access_pa(pa_id) AND (is_admin(( SELECT auth.uid() AS uid)) OR is_gestor_compras()) AND (actor_id = ( SELECT auth.uid() AS uid)) AND pa_budget_entry_scope_ok(pa_budget_id, pa_id, competencia_ano, competencia_mes))` |

### `pa_budget_entries_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `user_can_access_pa(pa_id)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_pa_budget_entries_competencia | BEFORE | INSERT | ROW | enabled | public.tg_pa_budget_entries_competencia_aberta |
| trg_pa_budget_entries_imutavel | BEFORE | DELETE OR UPDATE | ROW | enabled | public.tg_pa_budget_entries_immutable |
| trg_recalc_pa_budget_states | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.tg_recalc_pa_budget_states |


## Grants

_nenhum_
