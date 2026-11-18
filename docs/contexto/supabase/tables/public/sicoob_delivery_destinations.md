# public.sicoob_delivery_destinations

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
| 2 | `consolidation_id` | `uuid` | não |  |  |  |
| 3 | `pa_id` | `uuid` | não |  |  |  |
| 4 | `destination_name` | `text` | não |  |  |  |
| 5 | `address_snapshot` | `jsonb` | não |  |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sicoob_delivery_destinations_address_snapshot_check | CHECK | `CHECK (jsonb_typeof(address_snapshot) = 'object'::text)` |  |  | sim |
| sicoob_delivery_destinations_consolidation_id_fkey | FOREIGN KEY | `FOREIGN KEY (consolidation_id) REFERENCES order_consolidations(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| sicoob_delivery_destinations_consolidation_id_pa_id_key | UNIQUE | `UNIQUE (consolidation_id, pa_id)` |  |  | sim |
| sicoob_delivery_destinations_destination_name_check | CHECK | `CHECK (length(TRIM(BOTH FROM destination_name)) > 0)` |  |  | sim |
| sicoob_delivery_destinations_pa_id_fkey | FOREIGN KEY | `FOREIGN KEY (pa_id) REFERENCES postos_atendimento(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| sicoob_delivery_destinations_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.sicoob_delivery_allocations | sicoob_delivery_allocations_destination_id_fkey | destination_id | RESTRICT |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_delivery_destinations_group | btree | consolidation_id | não | sim |  | `CREATE INDEX idx_delivery_destinations_group ON public.sicoob_delivery_destinations USING btree (consolidation_id)` |
| idx_sicoob_delivery_destinations_pa_id | btree | pa_id | não | sim |  | `CREATE INDEX idx_sicoob_delivery_destinations_pa_id ON public.sicoob_delivery_destinations USING btree (pa_id)` |
| sicoob_delivery_destinations_consolidation_id_pa_id_key | btree | consolidation_id, pa_id | sim | sim |  | `CREATE UNIQUE INDEX sicoob_delivery_destinations_consolidation_id_pa_id_key ON public.sicoob_delivery_destinations USING btree (consolidation_id, pa_id)` |
| sicoob_delivery_destinations_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sicoob_delivery_destinations_pkey ON public.sicoob_delivery_destinations USING btree (id)` |


## Policies (RLS)

### `delivery_destinations_read_in_scope`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(sicoob_current_actor_can_view_all_consolidation(consolidation_id) OR sicoob_current_actor_can_receive_destination(id))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_protect_delivery_destinations | BEFORE | INSERT OR DELETE OR UPDATE | ROW | enabled | public.protect_sicoob_consolidation_records |


## Grants

_nenhum_
