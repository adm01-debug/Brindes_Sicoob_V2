# public.pa_budgets

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 10 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.sicoob_budget_audit |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `pa_id` | `uuid` | não |  |  |  |
| 3 | `ano` | `integer` | não |  |  |  |
| 4 | `mes` | `integer` | não |  |  |  |
| 5 | `verba_total` | `numeric(14,2)` | não | `0` |  |  |
| 6 | `verba_consumida` | `numeric(14,2)` | não | `0` |  |  |
| 7 | `limite_alcada` | `numeric(14,2)` | sim |  |  |  |
| 8 | `observacoes` | `text` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `verba_planejada` | `numeric(14,2)` | não | `0` |  |  |
| 12 | `verba_reservada` | `numeric(14,2)` | não | `0` |  |  |
| 13 | `verba_comprometida` | `numeric(14,2)` | não | `0` |  |  |
| 14 | `cost_center_id` | `uuid` | sim |  |  |  |
| 15 | `fechada_em` | `timestamp with time zone` | sim |  |  |  |
| 16 | `fechada_por` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| check_ano_range | CHECK | `CHECK (ano >= 2000 AND ano <= 2100)` |  |  | sim |
| check_limite_alcada_non_negative | CHECK | `CHECK (limite_alcada >= 0::numeric)` |  |  | sim |
| check_limite_alcada_within_budget | CHECK | `CHECK (limite_alcada <= verba_total)` |  |  | sim |
| check_mes_range | CHECK | `CHECK (mes >= 1 AND mes <= 12)` |  |  | sim |
| check_positive_limite_alcada | CHECK | `CHECK (limite_alcada >= 0::numeric)` |  |  | sim |
| check_positive_verba_consumida | CHECK | `CHECK (verba_consumida >= 0::numeric)` |  |  | sim |
| check_positive_verba_total | CHECK | `CHECK (verba_total >= 0::numeric)` |  |  | sim |
| check_verba_total_positive | CHECK | `CHECK (verba_total > 0::numeric)` |  |  | sim |
| pa_budgets_ano_check | CHECK | `CHECK (ano >= 2024 AND ano <= 2100)` |  |  | sim |
| pa_budgets_cost_center_id_fkey | FOREIGN KEY | `FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| pa_budgets_estados_nao_negativos | CHECK | `CHECK (verba_planejada >= 0::numeric AND verba_reservada >= 0::numeric AND verba_comprometida >= 0::numeric AND verba_consumida >= 0::numeric)` |  |  | sim |
| pa_budgets_fechada_por_fkey | FOREIGN KEY | `FOREIGN KEY (fechada_por) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| pa_budgets_limite_alcada_check | CHECK | `CHECK (limite_alcada IS NULL OR limite_alcada >= 0::numeric)` |  |  | sim |
| pa_budgets_mes_check | CHECK | `CHECK (mes >= 1 AND mes <= 12)` |  |  | sim |
| pa_budgets_pa_id_ano_mes_key | UNIQUE | `UNIQUE (pa_id, ano, mes)` |  |  | sim |
| pa_budgets_pa_id_fkey | FOREIGN KEY | `FOREIGN KEY (pa_id) REFERENCES postos_atendimento(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| pa_budgets_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| pa_budgets_verba_consumida_check | CHECK | `CHECK (verba_consumida >= 0::numeric)` |  |  | sim |
| pa_budgets_verba_total_check | CHECK | `CHECK (verba_total >= 0::numeric)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.pa_budget_entries | pa_budget_entries_pa_budget_id_fkey | pa_budget_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pa_budgets_cost_center | btree | cost_center_id | não | sim |  | `CREATE INDEX idx_pa_budgets_cost_center ON public.pa_budgets USING btree (cost_center_id)` |
| idx_pa_budgets_pa | btree | pa_id | não | sim |  | `CREATE INDEX idx_pa_budgets_pa ON public.pa_budgets USING btree (pa_id)` |
| idx_pa_budgets_period | btree | ano, mes | não | sim |  | `CREATE INDEX idx_pa_budgets_period ON public.pa_budgets USING btree (ano, mes)` |
| pa_budgets_pa_id_ano_mes_key | btree | pa_id, ano, mes | sim | sim |  | `CREATE UNIQUE INDEX pa_budgets_pa_id_ano_mes_key ON public.pa_budgets USING btree (pa_id, ano, mes)` |
| pa_budgets_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX pa_budgets_pkey ON public.pa_budgets USING btree (id)` |


## Policies (RLS)

### `pa_budgets_active_scope_delete_guard`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | RESTRICTIVE |
| roles | authenticated |
| USING | `is_admin(( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |

### `pa_budgets_active_scope_insert_guard`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | RESTRICTIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(is_admin(( SELECT auth.uid() AS uid)) OR (has_role(( SELECT auth.uid() AS uid), 'gestor_compras'::app_role) AND (EXISTS ( SELECT 1    FROM postos_atendimento service_point   WHERE ((service_point.id = pa_budgets.pa_id) AND (service_point.is_active IS TRUE) AND (service_point.cooperativa_id = current_user_cooperativa_id()))))))` |

### `pa_budgets_active_scope_select_guard`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | RESTRICTIVE |
| roles | authenticated |
| USING | `(is_admin(( SELECT auth.uid() AS uid)) OR (has_role(( SELECT auth.uid() AS uid), 'gestor_compras'::app_role) AND (EXISTS ( SELECT 1    FROM postos_atendimento service_point   WHERE ((service_point.id = pa_budgets.pa_id) AND (service_point.is_active IS TRUE) AND (service_point.cooperativa_id = current_user_cooperativa_id()))))) OR (has_role(( SELECT auth.uid() AS uid), 'gerente_pa'::app_role) AND (pa_id = current_user_pa_id())) OR (has_role(( SELECT auth.uid() AS uid), 'comprador_pac'::app_role) AND (pa_id = current_user_pa_id())) OR (has_role(( SELECT auth.uid() AS uid), 'comprador_singular'::app_role) AND (EXISTS ( SELECT 1    FROM postos_atendimento service_point   WHERE ((service_point.id = pa_budgets.pa_id) AND (service_point.is_active IS TRUE) AND (service_point.cooperativa_id = current_user_cooperativa_id()))))))` |
| WITH CHECK |  |

### `pa_budgets_active_scope_update_guard`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | RESTRICTIVE |
| roles | authenticated |
| USING | `(is_admin(( SELECT auth.uid() AS uid)) OR (has_role(( SELECT auth.uid() AS uid), 'gestor_compras'::app_role) AND (EXISTS ( SELECT 1    FROM postos_atendimento service_point   WHERE ((service_point.id = pa_budgets.pa_id) AND (service_point.is_active IS TRUE) AND (service_point.cooperativa_id = current_user_cooperativa_id()))))))` |
| WITH CHECK | `(is_admin(( SELECT auth.uid() AS uid)) OR (has_role(( SELECT auth.uid() AS uid), 'gestor_compras'::app_role) AND (EXISTS ( SELECT 1    FROM postos_atendimento service_point   WHERE ((service_point.id = pa_budgets.pa_id) AND (service_point.is_active IS TRUE) AND (service_point.cooperativa_id = current_user_cooperativa_id()))))))` |

### `pa_budgets_anon_deny`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | RESTRICTIVE |
| roles | anon |
| USING | `false` |
| WITH CHECK | `false` |

### `pa_budgets_buyer_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((has_role(( SELECT auth.uid() AS uid), 'comprador_pac'::app_role) AND (pa_id = current_user_pa_id())) OR (has_role(( SELECT auth.uid() AS uid), 'comprador_singular'::app_role) AND (EXISTS ( SELECT 1    FROM postos_atendimento service_point   WHERE ((service_point.id = pa_budgets.pa_id) AND (service_point.is_active IS TRUE) AND (service_point.cooperativa_id = current_user_cooperativa_id()))))))` |
| WITH CHECK |  |

### `sicoob_merged_8105c624b2d3b7d0_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (EXISTS ( SELECT 1    FROM postos_atendimento pa   WHERE ((pa.id = pa_budgets.pa_id) AND (pa.cooperativa_id = current_user_cooperativa_id()) AND has_role(( SELECT auth.uid() AS uid), 'gestor_compras'::app_role))))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR is_gestor_compras())))` |

### `sicoob_merged_8a1d9b1643cb04c9_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (EXISTS ( SELECT 1    FROM postos_atendimento pa   WHERE ((pa.id = pa_budgets.pa_id) AND (pa.cooperativa_id = current_user_cooperativa_id()) AND has_role(( SELECT auth.uid() AS uid), 'gestor_compras'::app_role))))) OR (true AND (EXISTS ( SELECT 1    FROM postos_atendimento pa   WHERE ((pa.id = pa_budgets.pa_id) AND (pa.cooperativa_id = current_user_cooperativa_id()) AND has_role(( SELECT auth.uid() AS uid), 'gestor_compras'::app_role))))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR is_gestor_compras() OR (pa_id = current_user_pa_id()))))` |
| WITH CHECK |  |

### `sicoob_merged_eaa0cb4d396f46ad_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (EXISTS ( SELECT 1    FROM postos_atendimento pa   WHERE ((pa.id = pa_budgets.pa_id) AND (pa.cooperativa_id = current_user_cooperativa_id()) AND has_role(( SELECT auth.uid() AS uid), 'gestor_compras'::app_role))))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)))` |
| WITH CHECK |  |

### `sicoob_merged_ef57a9c715eba979_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (EXISTS ( SELECT 1    FROM postos_atendimento pa   WHERE ((pa.id = pa_budgets.pa_id) AND (pa.cooperativa_id = current_user_cooperativa_id()) AND has_role(( SELECT auth.uid() AS uid), 'gestor_compras'::app_role))))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (is_gerente_pa() AND (pa_id = ( SELECT p.pa_id    FROM profiles p   WHERE (p.user_id = ( SELECT auth.uid() AS uid)))))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR is_gestor_compras())))` |
| WITH CHECK | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (EXISTS ( SELECT 1    FROM postos_atendimento pa   WHERE ((pa.id = pa_budgets.pa_id) AND (pa.cooperativa_id = current_user_cooperativa_id()) AND has_role(( SELECT auth.uid() AS uid), 'gestor_compras'::app_role))))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (is_gerente_pa() AND (pa_id = ( SELECT p.pa_id    FROM profiles p   WHERE (p.user_id = ( SELECT auth.uid() AS uid)))))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR is_gestor_compras())))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_pa_budgets_updated | BEFORE | UPDATE | ROW | enabled | public.tg_set_updated_at |
| trg_sync_pa_budget_planejada | BEFORE | INSERT OR UPDATE | ROW | enabled | public.tg_sync_pa_budget_planejada |
| update_pa_budgets_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
