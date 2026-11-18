# public.postos_atendimento

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
| usada por views | public.sicoob_budget_audit, public.v_sicoob_hierarchy |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `cooperativa_id` | `uuid` | não |  |  |  |
| 3 | `nome` | `text` | não |  |  |  |
| 4 | `codigo` | `text` | não |  |  |  |
| 5 | `endereco` | `text` | sim |  |  |  |
| 6 | `cidade` | `text` | sim |  |  |  |
| 7 | `uf` | `text` | sim |  |  |  |
| 8 | `responsavel_user_id` | `uuid` | sim |  |  |  |
| 9 | `is_active` | `boolean` | não | `true` |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| postos_atendimento_cooperativa_id_codigo_key | UNIQUE | `UNIQUE (cooperativa_id, codigo)` |  |  | sim |
| postos_atendimento_cooperativa_id_fkey | FOREIGN KEY | `FOREIGN KEY (cooperativa_id) REFERENCES cooperativas(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| postos_atendimento_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| postos_atendimento_responsavel_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (responsavel_user_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| postos_atendimento_uf_check | CHECK | `CHECK (uf IS NULL OR length(uf) = 2)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.limit_increase_requests | limit_increase_requests_pa_id_fkey | pa_id | NO ACTION |
| public.pa_budgets | pa_budgets_pa_id_fkey | pa_id | CASCADE |
| public.pa_category_thresholds | pa_category_thresholds_pa_id_fkey | pa_id | CASCADE |
| public.pa_notification_settings | pa_notification_settings_pa_id_fkey | pa_id | CASCADE |
| public.profiles | profiles_pa_id_fkey | pa_id | SET NULL |
| public.quotes | quotes_pa_id_fkey | pa_id | NO ACTION |
| public.sicoob_approval_delegations | sicoob_approval_delegations_pa_id_fkey | pa_id | NO ACTION |
| public.sicoob_delivery_destinations | sicoob_delivery_destinations_pa_id_fkey | pa_id | RESTRICT |
| public.sicoob_invitations | sicoob_invitations_pa_id_fkey | pa_id | RESTRICT |
| public.sicoob_orders | sicoob_orders_pa_id_fkey | pa_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pas_coop | btree | cooperativa_id | não | sim |  | `CREATE INDEX idx_pas_coop ON public.postos_atendimento USING btree (cooperativa_id)` |
| idx_pas_responsavel | btree | responsavel_user_id | não | sim |  | `CREATE INDEX idx_pas_responsavel ON public.postos_atendimento USING btree (responsavel_user_id)` |
| postos_atendimento_cooperativa_id_codigo_key | btree | cooperativa_id, codigo | sim | sim |  | `CREATE UNIQUE INDEX postos_atendimento_cooperativa_id_codigo_key ON public.postos_atendimento USING btree (cooperativa_id, codigo)` |
| postos_atendimento_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX postos_atendimento_pkey ON public.postos_atendimento USING btree (id)` |


## Policies (RLS)

### `sicoob_merged_1bb4cb2b391973bc_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid))) OR (true AND (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'supervisor'::text])))))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND ((is_active = true) OR is_admin(( SELECT auth.uid() AS uid)))))` |
| WITH CHECK |  |

### `sicoob_merged_3d0b80535375759c_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid))) OR (true AND (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'supervisor'::text])))))))` |
| WITH CHECK |  |

### `sicoob_merged_4966db5e4c353f85_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid))) OR (true AND (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'supervisor'::text])))))))` |
| WITH CHECK | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid))) OR (true AND (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'supervisor'::text])))))))` |

### `sicoob_merged_b52a1069421c7b61_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid))) OR (true AND (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'supervisor'::text])))))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_audit_pas | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.log_sicoob_admin_action |
| trg_pas_updated | BEFORE | UPDATE | ROW | enabled | public.tg_set_updated_at |


## Grants

_nenhum_
