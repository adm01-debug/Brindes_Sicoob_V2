# public.order_consolidations

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `singular_id` | `uuid` | não |  |  |  |
| 3 | `vendedor_id` | `uuid` | não |  |  |  |
| 4 | `status` | `text` | não | `'draft'::text` |  |  |
| 5 | `total_value` | `numeric(12,2)` | não | `0` |  |  |
| 6 | `order_count` | `integer` | não | `0` |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `consolidated_by` | `uuid` | sim |  |  |  |
| 10 | `idempotency_key` | `uuid` | sim |  |  |  |
| 11 | `received_at` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| order_consolidations_consolidated_by_fkey | FOREIGN KEY | `FOREIGN KEY (consolidated_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| order_consolidations_order_count_check | CHECK | `CHECK (order_count >= 0)` |  |  | sim |
| order_consolidations_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| order_consolidations_singular_id_fkey | FOREIGN KEY | `FOREIGN KEY (singular_id) REFERENCES cooperativas(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| order_consolidations_total_value_check | CHECK | `CHECK (total_value >= 0::numeric)` |  |  | sim |
| order_consolidations_vendedor_id_fkey | FOREIGN KEY | `FOREIGN KEY (vendedor_id) REFERENCES auth.users(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.order_consolidation_orders | order_consolidation_orders_consolidation_id_fkey | consolidation_id | RESTRICT |
| public.sicoob_delivery_destinations | sicoob_delivery_destinations_consolidation_id_fkey | consolidation_id | RESTRICT |
| public.sicoob_orders | sicoob_orders_consolidation_id_fkey | consolidation_id | RESTRICT |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_fk_order_consolidations_consolidated_by_fkey | btree | consolidated_by | não | sim |  | `CREATE INDEX idx_fk_order_consolidations_consolidated_by_fkey ON public.order_consolidations USING btree (consolidated_by)` |
| idx_order_consolidations_singular_id | btree | singular_id | não | sim |  | `CREATE INDEX idx_order_consolidations_singular_id ON public.order_consolidations USING btree (singular_id)` |
| idx_order_consolidations_vendedor_id | btree | vendedor_id | não | sim |  | `CREATE INDEX idx_order_consolidations_vendedor_id ON public.order_consolidations USING btree (vendedor_id)` |
| order_consolidations_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX order_consolidations_pkey ON public.order_consolidations USING btree (id)` |
| ux_order_consolidations_idempotency | btree | idempotency_key | sim | sim | `(idempotency_key IS NOT NULL)` | `CREATE UNIQUE INDEX ux_order_consolidations_idempotency ON public.order_consolidations USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL)` |


## Policies (RLS)

### `consolidations_read_in_scope`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((vendedor_id = ( SELECT auth.uid() AS uid)) OR sicoob_current_actor_can_manage_consolidation(singular_id) OR sicoob_current_actor_can_receive_consolidation(id))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_protect_order_consolidations | BEFORE | INSERT OR DELETE OR UPDATE | ROW | enabled | public.protect_sicoob_consolidation_records |


## Grants

_nenhum_
