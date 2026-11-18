# public.mockup_prompt_history

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
| 2 | `config_id` | `uuid` | não |  |  |  |
| 3 | `config_key` | `text` | não |  |  |  |
| 4 | `old_prompt` | `text` | sim |  |  |  |
| 5 | `new_prompt` | `text` | não |  |  |  |
| 6 | `ai_model` | `text` | não |  |  |  |
| 7 | `version` | `integer` | não |  |  |  |
| 8 | `changed_by` | `uuid` | sim |  |  |  |
| 9 | `change_notes` | `text` | sim |  |  |  |
| 10 | `changed_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| mockup_prompt_history_config_id_fkey | FOREIGN KEY | `FOREIGN KEY (config_id) REFERENCES mockup_prompt_configs(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| mockup_prompt_history_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_mockup_prompt_history_config | btree | config_id, changed_at | não | sim |  | `CREATE INDEX idx_mockup_prompt_history_config ON public.mockup_prompt_history USING btree (config_id, changed_at DESC)` |
| mockup_prompt_history_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX mockup_prompt_history_pkey ON public.mockup_prompt_history USING btree (id)` |


## Policies (RLS)

### `Admins insert prompt history`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `is_admin(( SELECT auth.uid() AS uid))` |

### `Admins view prompt history`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `is_admin(( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
