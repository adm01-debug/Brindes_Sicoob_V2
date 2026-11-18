# public.cooperativa_budgets

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 9 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `cooperativa_id` | `uuid` | não |  |  |  |
| 3 | `ano` | `integer` | não |  |  |  |
| 4 | `mes` | `integer` | não |  |  |  |
| 5 | `verba_total` | `numeric(14,2)` | não | `0` |  |  |
| 6 | `limite_alcada` | `numeric(14,2)` | sim |  |  |  |
| 7 | `observacoes` | `text` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| check_ano_range | CHECK | `CHECK (ano >= 2000 AND ano <= 2100)` |  |  | sim |
| check_limite_alcada_non_negative | CHECK | `CHECK (limite_alcada >= 0::numeric)` |  |  | sim |
| check_limite_alcada_within_budget | CHECK | `CHECK (limite_alcada <= verba_total)` |  |  | sim |
| check_mes_range | CHECK | `CHECK (mes >= 1 AND mes <= 12)` |  |  | sim |
| check_verba_total_positive | CHECK | `CHECK (verba_total > 0::numeric)` |  |  | sim |
| cooperativa_budgets_ano_check | CHECK | `CHECK (ano >= 2024 AND ano <= 2100)` |  |  | sim |
| cooperativa_budgets_cooperativa_id_ano_mes_key | UNIQUE | `UNIQUE (cooperativa_id, ano, mes)` |  |  | sim |
| cooperativa_budgets_cooperativa_id_fkey | FOREIGN KEY | `FOREIGN KEY (cooperativa_id) REFERENCES cooperativas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| cooperativa_budgets_limite_alcada_check | CHECK | `CHECK (limite_alcada IS NULL OR limite_alcada >= 0::numeric)` |  |  | sim |
| cooperativa_budgets_mes_check | CHECK | `CHECK (mes >= 1 AND mes <= 12)` |  |  | sim |
| cooperativa_budgets_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| cooperativa_budgets_verba_total_check | CHECK | `CHECK (verba_total >= 0::numeric)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| cooperativa_budgets_cooperativa_id_ano_mes_key | btree | cooperativa_id, ano, mes | sim | sim |  | `CREATE UNIQUE INDEX cooperativa_budgets_cooperativa_id_ano_mes_key ON public.cooperativa_budgets USING btree (cooperativa_id, ano, mes)` |
| cooperativa_budgets_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX cooperativa_budgets_pkey ON public.cooperativa_budgets USING btree (id)` |
| idx_coop_budgets_period | btree | ano, mes | não | sim |  | `CREATE INDEX idx_coop_budgets_period ON public.cooperativa_budgets USING btree (ano, mes)` |


## Policies (RLS)

### `coop_budgets_anon_deny`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | RESTRICTIVE |
| roles | anon |
| USING | `false` |
| WITH CHECK | `false` |

### `coop_budgets_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)` |
| WITH CHECK |  |

### `coop_budgets_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR is_gestor_compras())` |

### `coop_budgets_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR is_gestor_compras() OR (cooperativa_id = current_user_cooperativa_id()))` |
| WITH CHECK |  |

### `coop_budgets_update_scoped`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR (is_gestor_compras() AND (cooperativa_id = ( SELECT p.cooperativa_id    FROM profiles p   WHERE (p.user_id = ( SELECT auth.uid() AS uid))))))` |
| WITH CHECK | `(has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR (is_gestor_compras() AND (cooperativa_id = ( SELECT p.cooperativa_id    FROM profiles p   WHERE (p.user_id = ( SELECT auth.uid() AS uid))))))` |

### `cooperativa_budgets_active_scope_delete_guard`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | RESTRICTIVE |
| roles | authenticated |
| USING | `is_admin(( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |

### `cooperativa_budgets_active_scope_insert_guard`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | RESTRICTIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(is_admin(( SELECT auth.uid() AS uid)) OR (has_role(( SELECT auth.uid() AS uid), 'gestor_compras'::app_role) AND (cooperativa_id = current_user_cooperativa_id())))` |

### `cooperativa_budgets_active_scope_select_guard`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | RESTRICTIVE |
| roles | authenticated |
| USING | `(is_admin(( SELECT auth.uid() AS uid)) OR (cooperativa_id = current_user_cooperativa_id()))` |
| WITH CHECK |  |

### `cooperativa_budgets_active_scope_update_guard`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | RESTRICTIVE |
| roles | authenticated |
| USING | `(is_admin(( SELECT auth.uid() AS uid)) OR (has_role(( SELECT auth.uid() AS uid), 'gestor_compras'::app_role) AND (cooperativa_id = current_user_cooperativa_id())))` |
| WITH CHECK | `(is_admin(( SELECT auth.uid() AS uid)) OR (has_role(( SELECT auth.uid() AS uid), 'gestor_compras'::app_role) AND (cooperativa_id = current_user_cooperativa_id())))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_coop_budgets_updated | BEFORE | UPDATE | ROW | enabled | public.tg_set_updated_at |


## Grants

_nenhum_
