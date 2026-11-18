# public.limit_increase_requests

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
| 2 | `pa_id` | `uuid` | sim |  |  |  |
| 3 | `requested_by` | `uuid` | sim |  |  |  |
| 4 | `current_limit` | `numeric(12,2)` | sim |  |  |  |
| 5 | `requested_limit` | `numeric(12,2)` | sim |  |  |  |
| 6 | `reason` | `text` | sim |  |  |  |
| 7 | `status` | `text` | sim | `'pending'::text` |  |  |
| 8 | `approved_by` | `uuid` | sim |  |  |  |
| 9 | `rejection_reason` | `text` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| limit_increase_requests_approved_by_fkey | FOREIGN KEY | `FOREIGN KEY (approved_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| limit_increase_requests_pa_id_fkey | FOREIGN KEY | `FOREIGN KEY (pa_id) REFERENCES postos_atendimento(id)` | NO ACTION | NO ACTION | sim |
| limit_increase_requests_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| limit_increase_requests_requested_by_fkey | FOREIGN KEY | `FOREIGN KEY (requested_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_fk_limit_increase_requests_approved_by_fkey | btree | approved_by | não | sim |  | `CREATE INDEX idx_fk_limit_increase_requests_approved_by_fkey ON public.limit_increase_requests USING btree (approved_by)` |
| idx_fk_limit_increase_requests_pa_id_fkey | btree | pa_id | não | sim |  | `CREATE INDEX idx_fk_limit_increase_requests_pa_id_fkey ON public.limit_increase_requests USING btree (pa_id)` |
| idx_fk_limit_increase_requests_requested_by_fkey | btree | requested_by | não | sim |  | `CREATE INDEX idx_fk_limit_increase_requests_requested_by_fkey ON public.limit_increase_requests USING btree (requested_by)` |
| limit_increase_requests_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX limit_increase_requests_pkey ON public.limit_increase_requests USING btree (id)` |


## Policies (RLS)

### `PA Managers can insert limit requests`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM profiles p   WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'gestor_pa'::text) AND (limit_increase_requests.pa_id = p.pa_id))))` |

### `Users can view their own PA limit requests`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM profiles p   WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND ((p.role = ANY (ARRAY['admin'::text, 'supervisor'::text])) OR ((p.role = 'gestor_pa'::text) AND (limit_increase_requests.pa_id = p.pa_id)) OR ((p.role = 'gestor_singular'::text) AND (EXISTS ( SELECT 1            FROM postos_atendimento pa           WHERE ((pa.id = limit_increase_requests.pa_id) AND (pa.cooperativa_id = p.cooperativa_id)))))))))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
