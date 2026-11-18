# public.mockup_prompt_configs

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
| 2 | `config_key` | `text` | não |  |  |  |
| 3 | `label` | `text` | não |  |  |  |
| 4 | `prompt_text` | `text` | não |  |  |  |
| 5 | `ai_model` | `text` | não | `'google/gemini-2.5-flash-image-preview'::text` |  |  |
| 6 | `technique_id` | `uuid` | sim |  |  |  |
| 7 | `is_active` | `boolean` | não | `true` |  |  |
| 8 | `version` | `integer` | não | `1` |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| mockup_prompt_configs_config_key_key | UNIQUE | `UNIQUE (config_key)` |  |  | sim |
| mockup_prompt_configs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.mockup_prompt_history | mockup_prompt_history_config_id_fkey | config_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_mockup_prompt_configs_key | btree | config_key | não | sim |  | `CREATE INDEX idx_mockup_prompt_configs_key ON public.mockup_prompt_configs USING btree (config_key)` |
| idx_mockup_prompt_configs_technique | btree | technique_id | não | sim |  | `CREATE INDEX idx_mockup_prompt_configs_technique ON public.mockup_prompt_configs USING btree (technique_id)` |
| mockup_prompt_configs_config_key_key | btree | config_key | sim | sim |  | `CREATE UNIQUE INDEX mockup_prompt_configs_config_key_key ON public.mockup_prompt_configs USING btree (config_key)` |
| mockup_prompt_configs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX mockup_prompt_configs_pkey ON public.mockup_prompt_configs USING btree (id)` |


## Policies (RLS)

### `Admins manage prompt configs`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `is_admin(( SELECT auth.uid() AS uid))` |
| WITH CHECK | `is_admin(( SELECT auth.uid() AS uid))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_log_mockup_prompt_change | BEFORE | UPDATE | ROW | enabled | public.log_mockup_prompt_change |
| update_mockup_prompt_configs_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
