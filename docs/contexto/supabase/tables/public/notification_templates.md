# public.notification_templates

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
| 2 | `system` | `text` | não |  |  |  |
| 3 | `event_type` | `text` | não |  |  |  |
| 4 | `channel` | `text` | não |  |  |  |
| 5 | `title_template` | `text` | não |  |  |  |
| 6 | `message_template` | `text` | não |  |  |  |
| 7 | `variables` | `text[]` | sim |  |  |  |
| 8 | `default_priority` | `integer` | sim | `1` |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| notification_templates_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| unique_template | UNIQUE | `UNIQUE (system, event_type, channel)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| notification_templates_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX notification_templates_pkey ON public.notification_templates USING btree (id)` |
| unique_template | btree | system, event_type, channel | sim | sim |  | `CREATE UNIQUE INDEX unique_template ON public.notification_templates USING btree (system, event_type, channel)` |


## Policies (RLS)

### `admin_read_notification_templates`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM user_roles ur   WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND ((ur.role)::text = ANY (ARRAY['admin'::text, 'dev'::text])))))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
