# public.quote_history

> Trilha de auditoria imutável de orçamentos; usuários autenticados apenas inserem eventos em seu próprio nome.

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
| 2 | `quote_id` | `uuid` | não |  |  |  |
| 3 | `user_id` | `uuid` | sim |  |  |  |
| 4 | `action` | `text` | não |  |  |  |
| 5 | `description` | `text` | sim |  |  |  |
| 6 | `field_changed` | `text` | sim |  |  |  |
| 7 | `old_value` | `text` | sim |  |  |  |
| 8 | `new_value` | `text` | sim |  |  |  |
| 9 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| quote_history_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| quote_history_quote_id_fkey | FOREIGN KEY | `FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_quote_history_quote_created | btree | quote_id, created_at | não | sim |  | `CREATE INDEX idx_quote_history_quote_created ON public.quote_history USING btree (quote_id, created_at DESC)` |
| idx_quote_history_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_quote_history_user_id ON public.quote_history USING btree (user_id)` |
| quote_history_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX quote_history_pkey ON public.quote_history USING btree (id)` |


## Policies (RLS)

### `quote_history_select_scope`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM quotes q   WHERE ((q.id = quote_history.quote_id) AND ((q.seller_id = ( SELECT auth.uid() AS uid)) OR can_manage_quote_scope(( SELECT auth.uid() AS uid), q.id)))))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
