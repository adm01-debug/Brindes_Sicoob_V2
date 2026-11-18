# public.cooperativas

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
| usada por views | public.v_sicoob_hierarchy |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `nome` | `text` | não |  |  |  |
| 3 | `codigo` | `text` | não |  |  |  |
| 4 | `cnpj` | `text` | sim |  |  |  |
| 5 | `cidade` | `text` | sim |  |  |  |
| 6 | `uf` | `text` | sim |  |  |  |
| 7 | `is_active` | `boolean` | não | `true` |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `alcada_superior_threshold` | `numeric(12,2)` | sim | `50000.00` |  |  |
| 11 | `central_id` | `uuid` | sim |  |  |  |
| 12 | `sicoob_tema_id` | `uuid` | sim |  |  |  |
| 13 | `email` | `text` | sim |  |  |  |
| 14 | `phone` | `text` | sim |  |  |  |
| 15 | `address` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| cooperativas_central_id_fkey | FOREIGN KEY | `FOREIGN KEY (central_id) REFERENCES sicoob_centrais(id)` | NO ACTION | NO ACTION | sim |
| cooperativas_codigo_key | UNIQUE | `UNIQUE (codigo)` |  |  | sim |
| cooperativas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| cooperativas_sicoob_tema_id_fkey | FOREIGN KEY | `FOREIGN KEY (sicoob_tema_id) REFERENCES sicoob_temas(id)` | NO ACTION | NO ACTION | sim |
| cooperativas_uf_check | CHECK | `CHECK (uf IS NULL OR length(uf) = 2)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.cooperativa_budgets | cooperativa_budgets_cooperativa_id_fkey | cooperativa_id | CASCADE |
| public.order_consolidations | order_consolidations_singular_id_fkey | singular_id | RESTRICT |
| public.postos_atendimento | postos_atendimento_cooperativa_id_fkey | cooperativa_id | RESTRICT |
| public.profiles | profiles_cooperativa_id_fkey | cooperativa_id | SET NULL |
| public.quote_consolidations | quote_consolidations_singular_id_fkey | singular_id | NO ACTION |
| public.quotes | quotes_singular_id_fkey | singular_id | NO ACTION |
| public.sicoob_approval_delegations | sicoob_approval_delegations_cooperative_id_fkey | cooperative_id | NO ACTION |
| public.sicoob_approval_policies | sicoob_approval_policies_cooperative_id_fkey | cooperative_id | CASCADE |
| public.sicoob_invitation_events | sicoob_invitation_events_cooperative_id_fkey | cooperative_id | RESTRICT |
| public.sicoob_invitations | sicoob_invitations_cooperative_id_fkey | cooperative_id | RESTRICT |
| public.sicoob_orders | sicoob_orders_cooperative_id_fkey | cooperative_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| cooperativas_codigo_key | btree | codigo | sim | sim |  | `CREATE UNIQUE INDEX cooperativas_codigo_key ON public.cooperativas USING btree (codigo)` |
| cooperativas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX cooperativas_pkey ON public.cooperativas USING btree (id)` |
| idx_cooperativas_active | btree | is_active | não | sim | `(is_active = true)` | `CREATE INDEX idx_cooperativas_active ON public.cooperativas USING btree (is_active) WHERE (is_active = true)` |
| idx_fk_cooperativas_central_id_fkey | btree | central_id | não | sim |  | `CREATE INDEX idx_fk_cooperativas_central_id_fkey ON public.cooperativas USING btree (central_id)` |
| idx_fk_cooperativas_sicoob_tema_id_fkey | btree | sicoob_tema_id | não | sim |  | `CREATE INDEX idx_fk_cooperativas_sicoob_tema_id_fkey ON public.cooperativas USING btree (sicoob_tema_id)` |


## Policies (RLS)

### `sicoob_merged_07815bcfd8489ca6_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid))) OR (true AND (has_role(( SELECT auth.uid() AS uid), 'gestor_compras'::app_role) AND (id = current_user_cooperativa_id()))) OR (true AND (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'supervisor'::text])))))))` |
| WITH CHECK | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid))) OR (true AND (has_role(( SELECT auth.uid() AS uid), 'gestor_compras'::app_role) AND (id = current_user_cooperativa_id()))) OR (true AND (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'supervisor'::text])))))))` |

### `sicoob_merged_0ea46fd59ccce219_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid))) OR (true AND (has_role(( SELECT auth.uid() AS uid), 'gestor_compras'::app_role) AND (id = current_user_cooperativa_id()))) OR (true AND (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'supervisor'::text])))))) OR (pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND ((is_active = true) OR is_admin(( SELECT auth.uid() AS uid)))))` |
| WITH CHECK |  |

### `sicoob_merged_3a11014f04f02ff7_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid))) OR (true AND (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'supervisor'::text])))))))` |

### `sicoob_merged_59ff2965a28708bf_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((pg_has_role(CURRENT_USER, 'authenticated'::name, 'member'::text) AND is_admin(( SELECT auth.uid() AS uid))) OR (true AND (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'supervisor'::text])))))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_audit_cooperativas | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.log_sicoob_admin_action |
| trg_cooperativas_updated | BEFORE | UPDATE | ROW | enabled | public.tg_set_updated_at |


## Grants

_nenhum_
