# public.pa_notification_settings

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 6 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `pa_id` | `uuid` | não |  |  |  |
| 3 | `channel` | `text` | não |  |  |  |
| 4 | `webhook_url` | `text` | sim |  |  |  |
| 5 | `recipient_email` | `text` | sim |  |  |  |
| 6 | `is_active` | `boolean` | sim | `true` |  |  |
| 7 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| pa_notification_settings_channel_check | CHECK | `CHECK (channel = ANY (ARRAY['email'::text, 'slack'::text]))` |  |  | sim |
| pa_notification_settings_pa_id_channel_key | UNIQUE | `UNIQUE (pa_id, channel)` |  |  | sim |
| pa_notification_settings_pa_id_fkey | FOREIGN KEY | `FOREIGN KEY (pa_id) REFERENCES postos_atendimento(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| pa_notification_settings_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.sicoob_approval_deliveries | sicoob_approval_deliveries_setting_id_fkey | setting_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| pa_notification_settings_pa_id_channel_key | btree | pa_id, channel | sim | sim |  | `CREATE UNIQUE INDEX pa_notification_settings_pa_id_channel_key ON public.pa_notification_settings USING btree (pa_id, channel)` |
| pa_notification_settings_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX pa_notification_settings_pkey ON public.pa_notification_settings USING btree (id)` |


## Policies (RLS)

### `Admins can manage notification settings`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(is_admin(( SELECT auth.uid() AS uid)) AND ((( SELECT auth.jwt() AS jwt) ->> 'aal'::text) = 'aal2'::text))` |
| WITH CHECK | `(is_admin(( SELECT auth.uid() AS uid)) AND ((( SELECT auth.jwt() AS jwt) ->> 'aal'::text) = 'aal2'::text))` |

### `sicoob_merged_71fae1b1eedcc5b5_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING |  |
| WITH CHECK | `(true AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role))` |

### `sicoob_merged_9b671c7e49638bf8_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(true AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role))` |
| WITH CHECK | `(true AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role))` |

### `sicoob_merged_d944d75e38e89832_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `(true AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role))` |
| WITH CHECK |  |

### `sicoob_merged_ed8c1f30be89e526_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((true AND has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (true AND (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.pa_id = pa_notification_settings.pa_id) AND (profiles.role = ANY (ARRAY['gestor_pa'::text, 'gestor_singular'::text])))))))` |
| WITH CHECK |  |

### `sicoob_pa_notification_settings_escopo_gerencial`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(is_supervisor_or_above(( SELECT auth.uid() AS uid)) OR (is_gerente_pa() AND (pa_id = current_user_pa_id())) OR (is_gestor_compras() AND (EXISTS ( SELECT 1    FROM postos_atendimento pa   WHERE ((pa.id = pa_notification_settings.pa_id) AND (pa.cooperativa_id = current_user_cooperativa_id()))))))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
