# public.pa_budget_allocations

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
| 2 | `order_id` | `uuid` | não |  |  |  |
| 3 | `cost_center_id` | `uuid` | sim |  |  |  |
| 4 | `valor` | `numeric(14,2)` | não |  |  |  |
| 5 | `percentual` | `numeric(5,2)` | não |  |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| pa_budget_allocations_cost_center_id_fkey | FOREIGN KEY | `FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| pa_budget_allocations_order_cc_uk | UNIQUE | `UNIQUE (order_id, cost_center_id)` |  |  | sim |
| pa_budget_allocations_order_id_fkey | FOREIGN KEY | `FOREIGN KEY (order_id) REFERENCES sicoob_orders(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| pa_budget_allocations_percentual_check | CHECK | `CHECK (percentual >= 0::numeric AND percentual <= 100::numeric)` |  |  | sim |
| pa_budget_allocations_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| pa_budget_allocations_valor_check | CHECK | `CHECK (valor >= 0::numeric)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pba_cost_center | btree | cost_center_id | não | sim |  | `CREATE INDEX idx_pba_cost_center ON public.pa_budget_allocations USING btree (cost_center_id)` |
| idx_pba_order | btree | order_id | não | sim |  | `CREATE INDEX idx_pba_order ON public.pa_budget_allocations USING btree (order_id)` |
| pa_budget_allocations_order_cc_uk | btree | order_id, cost_center_id | sim | sim |  | `CREATE UNIQUE INDEX pa_budget_allocations_order_cc_uk ON public.pa_budget_allocations USING btree (order_id, cost_center_id)` |
| pa_budget_allocations_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX pa_budget_allocations_pkey ON public.pa_budget_allocations USING btree (id)` |


## Policies (RLS)

### `pa_budget_allocations_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `pa_budget_allocation_write_ok(order_id)` |
| WITH CHECK |  |

### `pa_budget_allocations_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(pa_budget_allocation_write_ok(order_id) AND ((cost_center_id IS NULL) OR (EXISTS ( SELECT 1    FROM ((cost_centers center      JOIN sicoob_orders ord ON ((ord.id = pa_budget_allocations.order_id)))      JOIN postos_atendimento service_point ON ((service_point.id = ord.pa_id)))   WHERE ((center.id = pa_budget_allocations.cost_center_id) AND (center.cooperativa_id = service_point.cooperativa_id))))))` |

### `pa_budget_allocations_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `sicoob_current_actor_can_read_order(order_id)` |
| WITH CHECK |  |

### `pa_budget_allocations_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `pa_budget_allocation_write_ok(order_id)` |
| WITH CHECK | `(pa_budget_allocation_write_ok(order_id) AND ((cost_center_id IS NULL) OR (EXISTS ( SELECT 1    FROM ((cost_centers center      JOIN sicoob_orders ord ON ((ord.id = pa_budget_allocations.order_id)))      JOIN postos_atendimento service_point ON ((service_point.id = ord.pa_id)))   WHERE ((center.id = pa_budget_allocations.cost_center_id) AND (center.cooperativa_id = service_point.cooperativa_id))))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_validate_order_allocations | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.tg_validate_order_allocations |


## Grants

_nenhum_
