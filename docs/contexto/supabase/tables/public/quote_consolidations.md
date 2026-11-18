# public.quote_consolidations

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
| 2 | `consolidated_by` | `uuid` | sim |  |  |  |
| 3 | `singular_id` | `uuid` | sim |  |  |  |
| 4 | `status` | `text` | sim | `'pending'::text` |  |  |
| 5 | `notes` | `text` | sim |  |  |  |
| 6 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 7 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| quote_consolidations_consolidated_by_fkey | FOREIGN KEY | `FOREIGN KEY (consolidated_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| quote_consolidations_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| quote_consolidations_singular_id_fkey | FOREIGN KEY | `FOREIGN KEY (singular_id) REFERENCES cooperativas(id)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.quotes | quotes_consolidation_id_fkey | consolidation_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_fk_quote_consolidations_consolidated_by_fkey | btree | consolidated_by | não | sim |  | `CREATE INDEX idx_fk_quote_consolidations_consolidated_by_fkey ON public.quote_consolidations USING btree (consolidated_by)` |
| idx_fk_quote_consolidations_singular_id_fkey | btree | singular_id | não | sim |  | `CREATE INDEX idx_fk_quote_consolidations_singular_id_fkey ON public.quote_consolidations USING btree (singular_id)` |
| quote_consolidations_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX quote_consolidations_pkey ON public.quote_consolidations USING btree (id)` |


## Policies (RLS)

### `Singular Buyers can manage their consolidations`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM profiles p   WHERE ((p.user_id = ( SELECT auth.uid() AS uid)) AND (p.role = ANY (ARRAY['gestor_compras'::text, 'comprador_singular'::text, 'admin'::text, 'dev'::text])) AND (p.cooperativa_id = quote_consolidations.singular_id))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_quote_consolidations_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
