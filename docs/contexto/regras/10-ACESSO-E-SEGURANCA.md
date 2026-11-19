# 10 · ACESSO E SEGURANÇA — quem pode o quê

> Gerado automaticamente por AI Context Sync v1.3.2 · commit `05af443ea9` · branch `main` · 2026-11-19 17:24 UTC
> Não edite à mão — regras humanas vão em `manual/`.

## Perfis / roles identificados

`admin`, `agent`, `agente`, `all`, `assistant`, `completed`, `comprador_pac`, `comprador_singular`, `denied`, `dev`, `dry_run`, `failed`, `gerente_pa`, `gestor_compras`, `gestor_pa`, `gestor_singular`, `granted`, `manager`, `member`, `object`, `owner`, `partial`, `pending`, `perm`, `permission`, `public`, `role`, `running`, `skipped`, `string`, `success`, `supervisor`, `user`, `vendedor`

- Tabelas de perfil/permissão: `user_roles`, `product_group_members`, `roles`, `organization_members`, `permissions`, `role_permissions`, `role_migration_batches`, `role_migration_items`
- Colunas de perfil: `profiles.role` (TEXT DEFAULT 'vendedor'), `user_roles.role` (app_role NOT NULL DEFAULT 'vendedor'), `expert_messages.role` (text NOT NULL DEFAULT 'user'), `organization_members.role` (org_role NOT NULL DEFAULT 'member'), `role_permissions.role` (app_role NOT NULL), `ai_usage_quotas.role` (app_role NOT NULL UNIQUE), `sicoob_invitations.role` (public.app_role NOT NULL)
- Claims do JWT usados em políticas/funções: `role`
- Funções usadas dentro de políticas RLS (a regra real está no corpo delas — veja `06`): `can_approve_discount`, `can_manage`, `can_manage_quote_scope`, `can_manage_quotes`, `can_view_all_sales`, `can_view_audit_logs`, `current_user_cooperativa_id`, `current_user_pa_id`, `get_user_cooperative_id`, `get_user_org_ids`, `get_user_pa_id`, `get_user_singular_id`, `has_org_role`, `has_role`, `is_admin`, `is_admin_strict`, `is_dev`, `is_gerente_pa`, `is_gestor_compras`, `is_kit_collaborator`, `is_kit_owner`, `is_manager_or_admin`, `is_order_owner_or_admin`, `is_supervisor_or_above`, `sicoob_actor_is_active`, `sicoob_current_actor_can_approve_order`, `sicoob_current_actor_can_issue_invitation`, `sicoob_current_actor_can_manage_consolidation`, `sicoob_current_actor_can_manage_fulfillment`, `sicoob_current_actor_can_read_order`, `sicoob_current_actor_can_receive_consolidation`, `sicoob_current_actor_can_receive_destination`, `sicoob_current_actor_can_view_all_consolidation`

## Matriz tabela × operação → quem pode (derivada das políticas RLS)

| Tabela | RLS | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|---|
| `_backup_custom_kits_pinned_20261118` | enabled | PUBLIC: false | PUBLIC: false | PUBLIC: false | PUBLIC: false |
| `_sicoob_rls_target_tables` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `access_blocked_log` | enabled | public: public.can_manage(auth.uid())<br>authenticated: public.can_manage((SELECT auth.uid())) | service_role: true | — | — |
| `access_security_settings` | enabled | public: public.can_manage(auth.uid())<br>authenticated: EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text IN ('admin','dev')) | public: public.can_manage(auth.uid())<br>authenticated: EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text IN ('admin','dev')) | public: public.can_manage(auth.uid())<br>authenticated: EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text IN ('admin','dev')) | public: public.can_manage(auth.uid())<br>authenticated: EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text IN ('admin','dev')) |
| `achievements` | enabled | public: is_active = true<br>public: has_role(auth.uid(), 'admin') | public: has_role(auth.uid(), 'admin') | public: has_role(auth.uid(), 'admin') | public: has_role(auth.uid(), 'admin') |
| `admin_audit_log` | enabled | public: is_supervisor_or_above(auth.uid())<br>authenticated: EXISTS ( SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager') ) | — | — | — |
| `admin_audit_log_default` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `admin_audit_log_y2024` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `admin_audit_log_y2025` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `admin_audit_log_y2026_m01` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `admin_audit_log_y2026_m02` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `admin_audit_log_y2026_m03` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `admin_audit_log_y2026_m04` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `admin_audit_log_y2026_m05` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `admin_audit_log_y2026_m06` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `admin_audit_log_y2026_m07` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `admin_audit_log_y2026_m08` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `admin_audit_log_y2026_m09` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `admin_audit_log_y2026_m10` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `admin_audit_log_y2026_m11` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `admin_audit_log_y2026_m12` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `admin_audit_log_y2027_m01` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `admin_audit_log_y2027_m02` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `admin_audit_log_y2027_m03` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `admin_config_audit` | enabled | authenticated: public.has_role(auth.uid(), 'admin')<br>authenticated: EXISTS ( SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager') ) | — | — | — |
| `admin_settings` | enabled | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') | — |
| `ai_insights_cache` | enabled | authenticated: auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role) | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role) |
| `ai_usage_events` | enabled | authenticated: auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role) | authenticated: auth.uid() = user_id | — | — |
| `ai_usage_logs` | enabled | authenticated: user_id = auth.uid()<br>authenticated: has_role(auth.uid(), 'admin'::app_role) | service_role: true | service_role: true | — |
| `ai_usage_quotas` | enabled | authenticated: true<br>authenticated: has_role(auth.uid(), 'admin'::app_role) | authenticated: has_role(auth.uid(), 'admin'::app_role) | authenticated: has_role(auth.uid(), 'admin'::app_role) | authenticated: has_role(auth.uid(), 'admin'::app_role) |
| `analytics_events` | enabled | public: true | — | — | — |
| `art_file_attachments` | enabled | public: auth.uid() = user_id<br>public: auth.uid() = user_id | public: auth.uid() = user_id<br>public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id<br>public: auth.uid() = user_id |
| `audit_log` | enabled | public: EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin' )<br>public: user_id = auth.uid()<br>public: has_role(auth.uid(), 'admin'::app_role)<br>public: auth.uid() = user_id<br>authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dev'::app_role) | public: auth.uid() IS NOT NULL<br>authenticated: user_id = auth.uid() OR user_id IS NULL | — | — |
| `audit_trail` | enabled | public: true | — | — | — |
| `bitrix_clients` | enabled | authenticated: true<br>public: true<br>PUBLIC: false | public: true<br>PUBLIC: false | public: true<br>PUBLIC: false | public: true<br>PUBLIC: false |
| `bitrix_deals` | enabled | authenticated: true<br>public: true<br>PUBLIC: false | public: true<br>PUBLIC: false | public: true<br>PUBLIC: false | public: true<br>PUBLIC: false |
| `bitrix_sync_logs` | enabled | authenticated: true<br>public: true<br>PUBLIC: false | public: true<br>PUBLIC: false | public: true<br>PUBLIC: false | public: true<br>PUBLIC: false |
| `blog_posts` | enabled | public: is_published = true<br>authenticated: EXISTS ( SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superuser') ) | authenticated: EXISTS ( SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superuser') ) | authenticated: EXISTS ( SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superuser') ) | authenticated: EXISTS ( SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superuser') ) |
| `bot_detection_log` | enabled | authenticated: public.is_dev(auth.uid()) | service_role: true | — | — |
| `cache_entries` | enabled | public: true | — | — | — |
| `campaigns` | enabled | authenticated: has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role) | authenticated: has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role) | authenticated: has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role) | authenticated: has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role) |
| `cart_items` | enabled | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id |
| `cart_templates` | enabled | public: auth.uid() = user_id<br>authenticated: user_id = auth.uid() | public: auth.uid() = user_id<br>authenticated: user_id = auth.uid() | public: auth.uid() = user_id<br>authenticated: user_id = auth.uid() | public: auth.uid() = user_id<br>authenticated: user_id = auth.uid() |
| `catalog_marketing_term_usage` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `catalog_marketing_terms` | enabled | authenticated: public.sicoob_actor_is_active((SELECT auth.uid())) | authenticated: created_by = (SELECT auth.uid()) AND public.sicoob_actor_is_active((SELECT auth.uid())) AND ( public.has_role((SELECT auth.ui | authenticated: public.sicoob_actor_is_active((SELECT auth.uid())) AND ( public.has_role((SELECT auth.uid()), 'admin'::public.app_role) OR pu | authenticated: public.sicoob_actor_is_active((SELECT auth.uid())) AND ( public.has_role((SELECT auth.uid()), 'admin'::public.app_role) OR pu |
| `catalog_product_marketing` | enabled | authenticated: public.sicoob_actor_is_active((SELECT auth.uid())) | authenticated: public.sicoob_actor_is_active((SELECT auth.uid())) AND created_by = (SELECT auth.uid()) AND ( public.has_role((SELECT auth.ui | — | authenticated: public.sicoob_actor_is_active((SELECT auth.uid())) AND ( public.has_role((SELECT auth.uid()), 'admin'::public.app_role) OR pu |
| `categories` | enabled | public: true | public: true | public: true | public: true |
| `category_icons` | enabled | public: true<br>public: has_role(auth.uid(), 'admin'::app_role)<br>public: true | public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: has_role(auth.uid(), 'admin'::app_role) |
| `city_whitelist` | enabled | public: public.can_manage(auth.uid())<br>public: public.can_manage(auth.uid()) | public: public.can_manage(auth.uid())<br>public: public.can_manage(auth.uid()) | public: public.can_manage(auth.uid())<br>public: public.can_manage(auth.uid()) | public: public.can_manage(auth.uid())<br>public: public.can_manage(auth.uid()) |
| `clients` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `cms_banners` | enabled | public: is_supervisor_or_above(auth.uid())<br>public: is_active = true<br>anon: is_active IS TRUE | public: is_supervisor_or_above(auth.uid()) | public: is_supervisor_or_above(auth.uid()) | public: is_supervisor_or_above(auth.uid()) |
| `cms_config` | enabled | public: true<br>authenticated: EXISTS ( SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superuser') ) | authenticated: EXISTS ( SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superuser') ) | authenticated: EXISTS ( SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superuser') ) | authenticated: EXISTS ( SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superuser') ) |
| `cms_sections` | enabled | public: is_supervisor_or_above(auth.uid())<br>public: is_active = true<br>anon: is_active IS TRUE | public: is_supervisor_or_above(auth.uid()) | public: is_supervisor_or_above(auth.uid()) | public: is_supervisor_or_above(auth.uid()) |
| `collection_item_reactions` | enabled | public: EXISTS ( SELECT 1 FROM public.collections c WHERE c.id = collection_item_reactions.collection_id AND c.is_public = true AND c.share_ | public: false | — | — |
| `collection_items` | enabled | authenticated: EXISTS ( SELECT 1 FROM collections WHERE collections.id = collection_items.collection_id AND collections.user_id = auth.uid()<br>public: EXISTS ( SELECT 1 FROM public.collections c WHERE c.id = collection_items.collection_id AND c.is_public = true AND c.share_token IS  | authenticated: EXISTS ( SELECT 1 FROM collections WHERE collections.id = collection_items.collection_id AND collections.user_id = auth.uid() | authenticated: EXISTS ( SELECT 1 FROM collections WHERE collections.id = collection_items.collection_id AND collections.user_id = auth.uid() | authenticated: EXISTS ( SELECT 1 FROM collections WHERE collections.id = collection_items.collection_id AND collections.user_id = auth.uid() |
| `collection_items_trash` | enabled | public: auth.uid() = user_id | public: auth.uid() = user_id | — | public: auth.uid() = user_id |
| `collections` | enabled | authenticated: user_id = auth.uid()<br>public: is_public = true AND share_token IS NOT NULL AND (share_expires_at IS NULL OR share_expires_at > now()) | authenticated: user_id = auth.uid() | authenticated: user_id = auth.uid() | authenticated: user_id = auth.uid() |
| `color_groups` | enabled | public: true<br>public: has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role) |
| `color_nuances` | enabled | public: true<br>public: has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role) |
| `color_variations` | enabled | public: true<br>public: has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role) |
| `companies` | enabled | public: true<br>public: has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role)<br>public: auth.uid() IS NOT NULL | public: has_role(auth.uid(), 'admin'::app_role)<br>public: auth.uid() IS NOT NULL | public: has_role(auth.uid(), 'admin'::app_role) |
| `company_addresses` | enabled | public: true<br>public: auth.uid() IS NOT NULL | public: auth.uid() IS NOT NULL | public: auth.uid() IS NOT NULL | public: auth.uid() IS NOT NULL |
| `company_contacts` | enabled | public: true<br>public: auth.uid() IS NOT NULL | public: auth.uid() IS NOT NULL | public: auth.uid() IS NOT NULL | public: auth.uid() IS NOT NULL |
| `comparison_reactions` | enabled | public: EXISTS ( SELECT 1 FROM public.user_comparisons uc WHERE uc.id = comparison_reactions.comparison_id AND uc.is_public = true AND (uc.s | public: false | — | — |
| `component_media` | enabled | authenticated: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: true | authenticated: has_role(auth.uid(), 'admin'::app_role) | authenticated: has_role(auth.uid(), 'admin'::app_role) | authenticated: has_role(auth.uid(), 'admin'::app_role) |
| `connection_test_history` | enabled | authenticated: public.is_dev(auth.uid()) | service_role: true | — | authenticated: public.is_dev(auth.uid()) |
| `contact_emails` | enabled | public: true<br>public: auth.uid() IS NOT NULL | public: auth.uid() IS NOT NULL | public: auth.uid() IS NOT NULL | public: auth.uid() IS NOT NULL |
| `contact_phones` | enabled | public: true<br>public: auth.uid() IS NOT NULL | public: auth.uid() IS NOT NULL | public: auth.uid() IS NOT NULL | public: auth.uid() IS NOT NULL |
| `cooperativa_budgets` | enabled | anon: false<br>authenticated: public.has_role(auth.uid(), 'admin') OR public.is_gestor_compras() OR cooperativa_id = public.current_user_cooperativa_id()<br>authenticated: public.is_admin((SELECT auth.uid())) OR cooperativa_budgets.cooperativa_id = public.current_user_cooperativa_id() | anon: false<br>authenticated: public.has_role(auth.uid(), 'admin') OR public.is_gestor_compras()<br>authenticated: public.is_admin((SELECT auth.uid())) OR ( public.has_role((SELECT auth.uid()), 'gestor_compras'::public.app_role) AND coopera | anon: false<br>authenticated: public.has_role(auth.uid(), 'admin') OR (public.is_gestor_compras() AND cooperativa_id = (SELECT p.cooperativa_id FROM public<br>authenticated: public.is_admin((SELECT auth.uid())) OR ( public.has_role((SELECT auth.uid()), 'gestor_compras'::public.app_role) AND coopera | anon: false<br>authenticated: public.has_role(auth.uid(), 'admin')<br>authenticated: public.is_admin((SELECT auth.uid())) |
| `cooperativas` | enabled | authenticated: is_admin(auth.uid())<br>authenticated: is_active = true OR is_admin(auth.uid())<br>public: public.has_role(auth.uid(), 'gestor_compras') AND id = public.current_user_cooperativa_id()<br>public: EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor')) | authenticated: is_admin(auth.uid())<br>public: EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor')) | authenticated: is_admin(auth.uid())<br>public: public.has_role(auth.uid(), 'gestor_compras') AND id = public.current_user_cooperativa_id()<br>public: EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor')) | authenticated: is_admin(auth.uid())<br>public: EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor')) |
| `cooperativas_parceiras` | enabled | authenticated: has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role) | authenticated: has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role) | authenticated: has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role) | authenticated: has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role) |
| `coupons` | enabled | authenticated: has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role) | authenticated: has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role) | authenticated: has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role) | authenticated: has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role) |
| `custom_kits` | enabled | authenticated: user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role)<br>authenticated: public.has_role(auth.uid(), 'admin'::app_role) | authenticated: user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role) | authenticated: user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role) | authenticated: user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role) |
| `device_login_notifications` | enabled | public: auth.uid() = user_id<br>authenticated: user_id = auth.uid() | public: true | — | — |
| `discount_approval_requests` | enabled | authenticated: seller_id = (SELECT auth.uid()) OR public.can_manage_quote_scope((SELECT auth.uid()), quote_id) | — | — | — |
| `e2e_cleanup_audit` | enabled | authenticated: public.has_role(auth.uid(), 'admin') | — | — | — |
| `e2e_cleanup_rate_limit` | enabled | anon: false<br>authenticated: false | anon: false<br>authenticated: false | anon: false<br>authenticated: false | anon: false<br>authenticated: false |
| `entity_versions` | enabled | public: true | public: auth.uid() = changed_by OR changed_by IS NULL | — | — |
| `expert_conversations` | enabled | public: seller_id = auth.uid() OR has_role(auth.uid(), 'admin')<br>authenticated: seller_id = auth.uid() | public: seller_id = auth.uid()<br>authenticated: seller_id = auth.uid() | public: seller_id = auth.uid() OR has_role(auth.uid(), 'admin')<br>authenticated: seller_id = auth.uid() | public: seller_id = auth.uid() OR has_role(auth.uid(), 'admin')<br>authenticated: seller_id = auth.uid() |
| `expert_messages` | enabled | public: EXISTS ( SELECT 1 FROM public.expert_conversations c WHERE c.id = expert_messages.conversation_id AND (c.seller_id = auth.uid() OR h<br>authenticated: EXISTS ( SELECT 1 FROM public.expert_conversations WHERE id = expert_messages.conversation_id AND seller_id = auth.uid() ) | public: EXISTS ( SELECT 1 FROM public.expert_conversations c WHERE c.id = expert_messages.conversation_id AND c.seller_id = auth.uid() )<br>authenticated: EXISTS ( SELECT 1 FROM public.expert_conversations WHERE id = expert_messages.conversation_id AND seller_id = auth.uid() ) | authenticated: EXISTS ( SELECT 1 FROM public.expert_conversations WHERE id = expert_messages.conversation_id AND seller_id = auth.uid() ) | authenticated: EXISTS ( SELECT 1 FROM public.expert_conversations WHERE id = expert_messages.conversation_id AND seller_id = auth.uid() ) |
| `export_audit_log` | enabled | public: is_admin(auth.uid())<br>public: auth.uid() = user_id | — | — | — |
| `export_jobs` | enabled | public: auth.uid() = user_id | public: auth.uid() = user_id | — | — |
| `external_connections` | enabled | authenticated: public.is_dev(auth.uid()) | authenticated: public.is_dev(auth.uid()) | authenticated: public.is_dev(auth.uid()) | authenticated: public.is_dev(auth.uid()) |
| `external_connections_sync_log` | enabled | authenticated: public.is_supervisor_or_above(auth.uid()) | — | — | — |
| `favorite_item_reactions` | enabled | anon, authenticated: EXISTS ( SELECT 1 FROM public.favorite_lists l WHERE l.id = favorite_item_reactions.list_id AND l.shared_token IS NOT N<br>authenticated: EXISTS ( SELECT 1 FROM public.favorite_lists l WHERE l.id = favorite_item_reactions.list_id AND l.user_id = auth.uid() )<br>authenticated: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: EXISTS ( SELECT 1 FROM public.favorite_lists AS owned_list WHERE owned_list.id = favorite_item_reactions.list_id AND owned_li | anon, authenticated: EXISTS ( SELECT 1 FROM public.favorite_lists l WHERE l.id = favorite_item_reactions.list_id AND l.shared_token IS NOT N | — | authenticated: EXISTS ( SELECT 1 FROM public.favorite_lists l WHERE l.id = favorite_item_reactions.list_id AND l.user_id = auth.uid() ) |
| `favorite_items` | enabled | authenticated: user_id = auth.uid()<br>authenticated: has_role(auth.uid(), 'admin'::app_role)<br>anon, authenticated: EXISTS ( SELECT 1 FROM public.favorite_lists l WHERE l.id = favorite_items.list_id AND l.shared_token IS NOT NULL AND (<br>authenticated: user_id = (SELECT auth.uid()) OR public.is_admin(auth.uid()) | authenticated: user_id = auth.uid() | authenticated: user_id = auth.uid() | authenticated: user_id = auth.uid() |
| `favorite_items_trash` | enabled | authenticated: user_id = auth.uid() | authenticated: user_id = auth.uid() | authenticated: user_id = auth.uid() | authenticated: user_id = auth.uid() |
| `favorite_lists` | enabled | authenticated: user_id = auth.uid()<br>authenticated: has_role(auth.uid(), 'admin'::app_role)<br>anon, authenticated: shared_token IS NOT NULL AND (shared_expires_at IS NULL OR shared_expires_at > now())<br>authenticated: user_id = (SELECT auth.uid()) OR public.is_admin(auth.uid()) | authenticated: user_id = auth.uid() | authenticated: user_id = auth.uid() | authenticated: user_id = auth.uid() |
| `feature_flags` | enabled | public: true | — | — | — |
| `file_scan_logs` | enabled | authenticated: has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role) | — | — | — |
| `follow_up_reminders` | enabled | public: user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)<br>authenticated: seller_id = auth.uid() | public: user_id = auth.uid()<br>authenticated: seller_id = auth.uid() | public: user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)<br>authenticated: seller_id = auth.uid() | public: user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)<br>authenticated: seller_id = auth.uid() |
| `future_stock_entries` | enabled | authenticated: true<br>authenticated: EXISTS ( SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'manager') ) | authenticated: EXISTS ( SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'manager') )<br>authenticated: EXISTS ( SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'manager', 'vendedor') ) | authenticated: EXISTS ( SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'manager') ) | authenticated: EXISTS ( SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'manager') ) |
| `generated_mockups` | enabled | public: seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)<br>authenticated: seller_id = auth.uid() | public: seller_id = auth.uid()<br>authenticated: seller_id = auth.uid() | public: seller_id = auth.uid()<br>authenticated: seller_id = auth.uid() | public: seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)<br>authenticated: seller_id = auth.uid() |
| `geo_allowed_countries` | enabled | public: true<br>public: has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role) |
| `hardening_health_snapshots` | enabled | authenticated: public.is_dev(auth.uid()) | — | — | — |
| `inbound_webhook_endpoints` | enabled | public: public.has_role(auth.uid(), 'admin') | public: public.has_role(auth.uid(), 'admin') | public: public.has_role(auth.uid(), 'admin') | public: public.has_role(auth.uid(), 'admin') |
| `inbound_webhook_events` | enabled | public: public.has_role(auth.uid(), 'admin') | — | — | public: public.has_role(auth.uid(), 'admin') |
| `integration_credentials` | enabled | authenticated: public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'dev'::public.app_role) | authenticated: public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'dev'::public.app_role) | authenticated: public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'dev'::public.app_role) | authenticated: public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'dev'::public.app_role) |
| `ip_access_control` | enabled | service_role: true<br>authenticated: public.is_dev(auth.uid()) | service_role: true<br>authenticated: public.is_dev(auth.uid()) | service_role: true<br>authenticated: public.is_dev(auth.uid()) | service_role: true<br>authenticated: public.is_dev(auth.uid()) |
| `ip_whitelist` | enabled | public: public.can_manage(auth.uid())<br>public: public.can_manage(auth.uid()) | public: public.can_manage(auth.uid())<br>public: public.can_manage(auth.uid()) | public: public.can_manage(auth.uid())<br>public: public.can_manage(auth.uid()) | public: public.can_manage(auth.uid())<br>public: public.can_manage(auth.uid()) |
| `kit_collaborators` | enabled | public: public.is_kit_owner(kit_id, auth.uid()) OR user_id = auth.uid() OR has_role(auth.uid(), 'admin') | public: public.is_kit_owner(kit_id, auth.uid()) | public: public.is_kit_owner(kit_id, auth.uid()) | public: public.is_kit_owner(kit_id, auth.uid()) |
| `kit_comments` | enabled | public: public.is_kit_owner(kit_id, auth.uid()) OR public.is_kit_collaborator(kit_id, auth.uid()) OR has_role(auth.uid(), 'admin') | public: author_id = auth.uid() AND ( public.is_kit_owner(kit_id, auth.uid()) OR public.is_kit_collaborator(kit_id, auth.uid()) ) | public: author_id = auth.uid() OR has_role(auth.uid(), 'admin') | public: author_id = auth.uid() OR has_role(auth.uid(), 'admin') |
| `kit_share_tokens` | enabled | authenticated: seller_id = auth.uid() | authenticated: seller_id = auth.uid() | authenticated: seller_id = auth.uid() | authenticated: seller_id = auth.uid() |
| `kit_templates` | enabled | authenticated: is_active = true OR public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') |
| `kit_variants` | enabled | public: EXISTS (SELECT 1 FROM public.custom_kits k WHERE k.id = kit_master_id AND k.user_id = auth.uid()) OR has_role(auth.uid(), 'admin') | public: EXISTS (SELECT 1 FROM public.custom_kits k WHERE k.id = kit_master_id AND k.user_id = auth.uid()) | public: EXISTS (SELECT 1 FROM public.custom_kits k WHERE k.id = kit_master_id AND k.user_id = auth.uid()) | public: EXISTS (SELECT 1 FROM public.custom_kits k WHERE k.id = kit_master_id AND k.user_id = auth.uid()) |
| `limit_increase_requests` | enabled | public: EXISTS ( SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND ( p.role IN ('admin', 'supervisor') OR (p.role = 'gestor_pa' AN | public: EXISTS ( SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'gestor_pa' AND limit_increase_requests.pa_id = p.pa_i | — | — |
| `login_attempts` | enabled | public: auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role)<br>authenticated: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: user_id = (SELECT auth.uid()) | public: true<br>service_role: true | — | — |
| `logistics_tracking` | enabled | authenticated: true | authenticated: public.has_role(auth.uid(), 'vendedor') OR public.has_role(auth.uid(), 'admin') | — | — |
| `magic_up_brand_kits` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `magic_up_campaigns` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `magic_up_comments` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.magic_up_generations g WHERE g.id = generation_id AND g.user_id = auth. | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `magic_up_generations` | enabled | public: auth.uid() = user_id<br>authenticated: user_id = auth.uid() | public: auth.uid() = user_id<br>authenticated: user_id = auth.uid() | public: auth.uid() = user_id<br>authenticated: user_id = auth.uid() | public: auth.uid() = user_id<br>authenticated: user_id = auth.uid() |
| `magic_up_public_shares` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `magic_up_reactions` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.magic_up_generations g WHERE g.id = generation_id AND g.user_id = auth. | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `manager_notification_config` | enabled | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id |
| `mcp_access_violations` | enabled | authenticated: public.has_role(auth.uid(), 'admin'::public.app_role) | — | — | — |
| `mcp_api_keys` | forced | authenticated: public.is_dev(auth.uid()) | authenticated: false | authenticated: false | authenticated: false |
| `mcp_full_grantors` | enabled | authenticated: public.is_admin_strict(auth.uid())<br>authenticated: public.is_dev(auth.uid()) | authenticated: public.is_admin_strict(auth.uid()) | authenticated: public.is_admin_strict(auth.uid()) | authenticated: public.is_admin_strict(auth.uid()) |
| `mcp_key_auto_revocations` | enabled | public: public.is_dev(auth.uid()) | — | — | — |
| `mockup_drafts` | enabled | public: auth.uid() = user_id<br>authenticated: user_id = auth.uid() | public: auth.uid() = user_id<br>authenticated: user_id = auth.uid() | public: auth.uid() = user_id<br>authenticated: user_id = auth.uid() | public: auth.uid() = user_id<br>authenticated: user_id = auth.uid() |
| `mockup_prompt_configs` | enabled | public: public.can_manage(auth.uid())<br>public: auth.uid() IS NOT NULL AND is_active = true<br>public: public.has_role(auth.uid(), 'admin') | public: public.can_manage(auth.uid())<br>public: public.has_role(auth.uid(), 'admin') | public: public.can_manage(auth.uid())<br>public: public.has_role(auth.uid(), 'admin') | public: public.can_manage(auth.uid())<br>public: public.has_role(auth.uid(), 'admin') |
| `mockup_prompt_history` | enabled | public: public.can_manage(auth.uid())<br>public: auth.uid() IS NOT NULL<br>public: public.has_role(auth.uid(), 'admin') | public: public.can_manage(auth.uid())<br>public: public.has_role(auth.uid(), 'admin') | public: public.can_manage(auth.uid()) | public: public.can_manage(auth.uid()) |
| `mockup_templates` | enabled | public: auth.uid() = user_id<br>public: auth.uid() = user_id | public: auth.uid() = user_id<br>public: auth.uid() = user_id | public: auth.uid() = user_id<br>public: auth.uid() = user_id | public: auth.uid() = user_id<br>public: auth.uid() = user_id |
| `newsletter_subscribers` | enabled | public: is_supervisor_or_above(auth.uid()) | public: is_supervisor_or_above(auth.uid())<br>public: true<br>anon: true | public: is_supervisor_or_above(auth.uid()) | public: is_supervisor_or_above(auth.uid()) |
| `notification_channels` | enabled | authenticated: public.is_admin(auth.uid())<br>authenticated: true | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) |
| `notification_digests` | enabled | public: auth.uid() = user_id | — | — | — |
| `notification_logs` | enabled | public: auth.uid() = user_id | — | — | — |
| `notification_preferences` | enabled | authenticated: user_id = (SELECT auth.uid()) | authenticated: user_id = (SELECT auth.uid()) | authenticated: user_id = (SELECT auth.uid()) | authenticated: user_id = (SELECT auth.uid()) |
| `notification_templates` | enabled | authenticated: EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text IN ('admin','dev')) | — | — | — |
| `notifications` | enabled | public: auth.uid() = user_id<br>public: auth.uid() = user_id | public: true<br>authenticated: user_id = (SELECT auth.uid()) | public: auth.uid() = user_id<br>public: auth.uid() = user_id | public: auth.uid() = user_id<br>public: auth.uid() = user_id |
| `optimization_logs` | enabled | public: true | — | — | — |
| `optimization_queue` | enabled | authenticated: public.is_dev(auth.uid()) | authenticated: public.is_dev(auth.uid()) | authenticated: public.is_dev(auth.uid()) | authenticated: public.is_dev(auth.uid()) |
| `optimization_queue_runs` | enabled | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') |
| `order_approval_history` | enabled | authenticated: EXISTS ( SELECT 1 FROM public.orders o WHERE o.id = order_approval_history.order_id AND (o.seller_id = auth.uid() OR o.organi | public: auth.uid() = approver_id | — | — |
| `order_audit_events` | enabled | anon: false<br>authenticated: has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role) OR EXISTS (SELECT 1 FROM public.orders o WHERE | authenticated: false<br>anon: false<br>public: auth.role() = 'authenticated' | anon: false | anon: false<br>public: false |
| `order_comments` | enabled | anon: false<br>authenticated: has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role) OR EXISTS (SELECT 1 FROM public.orders o WHERE | authenticated: public.is_order_owner_or_admin(order_id) AND author_id = auth.uid()<br>anon: false | authenticated: author_id = auth.uid()<br>anon: false | authenticated: author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'dev'::app_role)<br>anon: false |
| `order_consolidation_orders` | enabled | authenticated: public.sicoob_current_actor_can_view_all_consolidation(consolidation_id) | — | — | — |
| `order_consolidations` | enabled | authenticated: vendedor_id = auth.uid() OR public.sicoob_current_actor_can_manage_consolidation(singular_id) OR public.sicoob_current_actor_ | — | — | — |
| `order_duplicate_requests` | enabled | PUBLIC: false | PUBLIC: false | PUBLIC: false | PUBLIC: false |
| `order_history` | enabled | public: EXISTS ( SELECT 1 FROM public.orders o WHERE o.id = order_history.order_id AND (o.seller_id = auth.uid() OR has_role(auth.uid(), 'ad | public: EXISTS ( SELECT 1 FROM public.orders o WHERE o.id = order_history.order_id AND (o.seller_id = auth.uid() OR has_role(auth.uid(), 'ad | — | — |
| `order_invoices` | enabled | authenticated: public.is_order_owner_or_admin(order_id)<br>anon: false<br>authenticated: EXISTS ( SELECT 1 FROM public.orders o WHERE o.id = order_invoices.order_id AND (o.seller_id = auth.uid() OR o.organization_i<br>authenticated: public.is_admin(auth.uid()) | authenticated: public.is_order_owner_or_admin(order_id)<br>anon: false<br>authenticated: public.is_admin(auth.uid()) | authenticated: public.is_order_owner_or_admin(order_id)<br>anon: false<br>authenticated: public.is_admin(auth.uid()) | authenticated: public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'dev'::app_role)<br>anon: false<br>authenticated: public.is_admin(auth.uid()) |
| `order_items` | enabled | public: EXISTS ( SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND (o.seller_id = auth.uid() OR has_role(auth.uid(), 'admi<br>public: EXISTS ( SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND (o.seller_id = auth.uid() OR has_role(auth.uid(), 'admi<br>authenticated: public.can_view_all_sales() OR EXISTS ( SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND ( o.seller_id = a | public: EXISTS ( SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND (o.seller_id = auth.uid() OR has_role(auth.uid(), 'admi<br>authenticated: public.can_view_all_sales() OR EXISTS ( SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.seller_id = aut | public: EXISTS ( SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND (o.seller_id = auth.uid() OR has_role(auth.uid(), 'admi<br>authenticated: public.can_view_all_sales() OR EXISTS ( SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND ( o.seller_id = a | public: EXISTS ( SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND (o.seller_id = auth.uid() OR has_role(auth.uid(), 'admi<br>authenticated: public.can_view_all_sales() OR EXISTS ( SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.seller_id = aut |
| `order_logistics` | enabled | authenticated: EXISTS ( SELECT 1 FROM public.orders o WHERE o.id = order_logistics.order_id AND (o.seller_id = auth.uid() OR o.organization_<br>authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) |
| `order_logistics_tracking` | enabled | authenticated: public.is_order_owner_or_admin(order_id)<br>anon: false | authenticated: public.is_order_owner_or_admin(order_id)<br>anon: false | authenticated: public.is_order_owner_or_admin(order_id)<br>anon: false | authenticated: public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'dev'::app_role)<br>anon: false |
| `order_payments` | enabled | authenticated: public.is_order_owner_or_admin(order_id)<br>anon: false<br>public: EXISTS ( SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role IN ('supervisor', 'dev', 'admin', 'manager')) )<br>authenticated: EXISTS ( SELECT 1 FROM public.orders o WHERE o.id = order_payments.order_id AND (o.seller_id = auth.uid() OR o.organization_i<br>authenticated: public.is_admin(auth.uid()) | authenticated: public.is_order_owner_or_admin(order_id)<br>anon: false<br>authenticated: public.is_admin(auth.uid()) | authenticated: public.is_order_owner_or_admin(order_id)<br>anon: false<br>authenticated: public.is_admin(auth.uid()) | authenticated: public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'dev'::app_role)<br>anon: false<br>authenticated: public.is_admin(auth.uid()) |
| `order_pilot_approvals` | enabled | authenticated: public.is_order_owner_or_admin(order_id)<br>anon: false | authenticated: public.is_order_owner_or_admin(order_id)<br>anon: false | authenticated: public.is_order_owner_or_admin(order_id)<br>anon: false | authenticated: public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'dev'::app_role)<br>anon: false |
| `order_template_items` | enabled | authenticated: EXISTS (SELECT 1 FROM public.order_templates t WHERE t.id = template_id AND (t.user_id = auth.uid() OR public.has_role(auth.u<br>anon: false | authenticated: EXISTS (SELECT 1 FROM public.order_templates t WHERE t.id = template_id AND t.user_id = auth.uid())<br>anon: false | authenticated: EXISTS (SELECT 1 FROM public.order_templates t WHERE t.id = template_id AND t.user_id = auth.uid())<br>anon: false | authenticated: EXISTS (SELECT 1 FROM public.order_templates t WHERE t.id = template_id AND t.user_id = auth.uid())<br>anon: false |
| `order_templates` | enabled | authenticated: user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role) OR<br>anon: false | authenticated: user_id = auth.uid()<br>anon: false | authenticated: user_id = auth.uid()<br>anon: false | authenticated: user_id = auth.uid()<br>anon: false |
| `orders` | enabled | public: seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)<br>authenticated: public.can_view_all_sales() OR (public.has_role(auth.uid(),'supervisor'::public.app_role) AND (organization_id IS NULL OR org | public: seller_id = auth.uid()<br>authenticated: public.can_view_all_sales() OR seller_id = auth.uid() | public: seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)<br>authenticated: public.can_view_all_sales() OR (public.has_role(auth.uid(),'supervisor'::public.app_role) AND (organization_id IS NULL OR org | public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: public.can_view_all_sales() OR seller_id = auth.uid() |
| `organization_members` | enabled | authenticated: organization_id IN (SELECT public.get_user_org_ids(auth.uid())) | authenticated: has_org_role(auth.uid(), organization_id, 'owner'::org_role) | authenticated: public.has_org_role(auth.uid(), organization_id, 'owner') | authenticated: public.has_org_role(auth.uid(), organization_id, 'owner') OR user_id = auth.uid() |
| `organizations` | enabled | authenticated: id IN (SELECT public.get_user_org_ids(auth.uid())) | authenticated: auth.uid() IS NOT NULL | authenticated: public.has_org_role(auth.uid(), id, 'owner') | — |
| `outbound_webhooks` | enabled | public: public.has_role(auth.uid(), 'admin') | public: public.has_role(auth.uid(), 'admin') | public: public.has_role(auth.uid(), 'admin') | public: public.has_role(auth.uid(), 'admin') |
| `ownership_audit_reports` | enabled | public: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dev'::app_role) | public: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dev'::app_role) | — | public: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dev'::app_role) |
| `ownership_repair_logs` | enabled | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dev'::app_role) | — | — | — |
| `pa_budgets` | enabled | anon: false<br>authenticated: public.has_role(auth.uid(), 'admin') OR public.is_gestor_compras() OR pa_id = public.current_user_pa_id()<br>public: EXISTS ( SELECT 1 FROM public.postos_atendimento pa WHERE pa.id = pa_budgets.pa_id AND pa.cooperativa_id = public.current_user_coope<br>authenticated: EXISTS ( SELECT 1 FROM public.postos_atendimento pa WHERE pa.id = pa_budgets.pa_id AND pa.cooperativa_id = public.current_use<br>authenticated: public.has_role(auth.uid(), 'admin')<br>authenticated: public.has_role(auth.uid(), 'gestor_compras') AND singular_id = public.get_user_singular_id()<br>authenticated: public.has_role(auth.uid(), 'gerente_pa') AND pa_id = public.get_user_pa_id()<br>authenticated: public.is_admin((SELECT auth.uid())) OR ( public.has_role((SELECT auth.uid()), 'gestor_compras'::public.app_role) AND EXISTS <br>authenticated: ( public.has_role((SELECT auth.uid()), 'comprador_pac'::public.app_role) AND pa_budgets.pa_id = public.current_user_pa_id() ) | anon: false<br>authenticated: public.has_role(auth.uid(), 'admin') OR public.is_gestor_compras()<br>authenticated: EXISTS ( SELECT 1 FROM public.postos_atendimento pa WHERE pa.id = pa_budgets.pa_id AND pa.cooperativa_id = public.current_use<br>authenticated: public.has_role(auth.uid(), 'admin')<br>authenticated: public.has_role(auth.uid(), 'gestor_compras') AND singular_id = public.get_user_singular_id()<br>authenticated: public.is_admin((SELECT auth.uid())) OR ( public.has_role((SELECT auth.uid()), 'gestor_compras'::public.app_role) AND EXISTS  | anon: false<br>authenticated: public.has_role(auth.uid(), 'admin') OR public.is_gestor_compras()<br>authenticated: public.is_gerente_pa() AND pa_id = (SELECT p.pa_id FROM public.profiles p WHERE p.user_id = auth.uid())<br>authenticated: EXISTS ( SELECT 1 FROM public.postos_atendimento pa WHERE pa.id = pa_budgets.pa_id AND pa.cooperativa_id = public.current_use<br>authenticated: public.has_role(auth.uid(), 'admin')<br>authenticated: public.has_role(auth.uid(), 'gestor_compras') AND singular_id = public.get_user_singular_id()<br>authenticated: public.is_admin((SELECT auth.uid())) OR ( public.has_role((SELECT auth.uid()), 'gestor_compras'::public.app_role) AND EXISTS  | anon: false<br>authenticated: public.has_role(auth.uid(), 'admin')<br>authenticated: EXISTS ( SELECT 1 FROM public.postos_atendimento pa WHERE pa.id = pa_budgets.pa_id AND pa.cooperativa_id = public.current_use<br>authenticated: public.has_role(auth.uid(), 'admin')<br>authenticated: public.has_role(auth.uid(), 'gestor_compras') AND singular_id = public.get_user_singular_id()<br>authenticated: public.is_admin((SELECT auth.uid())) |
| `pa_category_thresholds` | enabled | authenticated: public.is_admin(auth.uid())<br>authenticated: true | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) |
| `pa_notification_settings` | enabled | public: public.has_role(auth.uid(), 'admin')<br>public: EXISTS ( SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.pa_id = pa_notification_settings.pa_id AND (profi | public: public.has_role(auth.uid(), 'admin') | public: public.has_role(auth.uid(), 'admin') | public: public.has_role(auth.uid(), 'admin') |
| `pa_singularidades` | enabled | public: true<br>public: EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'dev')) | public: EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'dev')) | public: EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'dev')) | public: EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'dev')) |
| `password_reset_requests` | enabled | public: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)<br>authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dev'::app_role) | public: true<br>anon, authenticated: status = 'pending' AND reviewed_at IS NULL AND reviewed_by IS NULL AND user_id IS NULL<br>authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dev'::app_role) | public: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)<br>authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dev'::app_role) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dev'::app_role) |
| `permissions` | enabled | authenticated: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: true | authenticated: has_role(auth.uid(), 'admin'::app_role) | authenticated: has_role(auth.uid(), 'admin'::app_role) | authenticated: has_role(auth.uid(), 'admin'::app_role) |
| `personalization_locations` | enabled | authenticated: true<br>authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') |
| `personalization_simulations` | enabled | public: seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)<br>authenticated: seller_id = auth.uid() | public: seller_id = auth.uid()<br>authenticated: seller_id = auth.uid() | public: seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)<br>authenticated: seller_id = auth.uid() | public: seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)<br>authenticated: seller_id = auth.uid() |
| `personalization_sizes` | enabled | authenticated: true<br>authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') |
| `personalization_techniques` | enabled | authenticated: true<br>authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') |
| `pontos_atendimento` | enabled | public: true<br>public: EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'dev')) | public: EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'dev')) | public: EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'dev')) | public: EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'dev')) |
| `portfolio_items` | enabled | public: is_active = true<br>authenticated: EXISTS ( SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superuser') ) | authenticated: EXISTS ( SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superuser') ) | authenticated: EXISTS ( SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superuser') ) | authenticated: EXISTS ( SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superuser') ) |
| `postos_atendimento` | enabled | authenticated: is_admin(auth.uid())<br>authenticated: is_active = true OR is_admin(auth.uid())<br>public: EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor')) | authenticated: is_admin(auth.uid())<br>public: EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor')) | authenticated: is_admin(auth.uid())<br>public: EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor')) | authenticated: is_admin(auth.uid())<br>public: EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor')) |
| `price_history` | enabled | authenticated: true | — | — | — |
| `private.quote_price_attestations` | enabled | — | — | — | — |
| `product_categories` | enabled | public: is_active = true<br>public: is_supervisor_or_above(auth.uid())<br>public: deleted_at IS NULL AND is_active = true<br>public: auth.uid() IN (SELECT user_id FROM profiles WHERE role = 'admin')<br>anon: deleted_at IS NULL AND is_active IS TRUE | public: is_supervisor_or_above(auth.uid())<br>public: auth.uid() IN (SELECT user_id FROM profiles WHERE role = 'admin') | public: is_supervisor_or_above(auth.uid())<br>public: auth.uid() IN (SELECT user_id FROM profiles WHERE role = 'admin') | public: is_supervisor_or_above(auth.uid())<br>public: auth.uid() IN (SELECT user_id FROM profiles WHERE role = 'admin') |
| `product_component_location_techniques` | enabled | authenticated: true<br>authenticated: public.has_role(auth.uid(), 'admin')<br>authenticated: true<br>authenticated: public.has_role(auth.uid(), 'admin'::public.app_role) | authenticated: public.has_role(auth.uid(), 'admin')<br>authenticated: public.has_role(auth.uid(), 'admin'::public.app_role) | authenticated: public.has_role(auth.uid(), 'admin')<br>authenticated: public.has_role(auth.uid(), 'admin'::public.app_role) | authenticated: public.has_role(auth.uid(), 'admin')<br>authenticated: public.has_role(auth.uid(), 'admin'::public.app_role) |
| `product_component_locations` | enabled | authenticated: true<br>authenticated: public.has_role(auth.uid(), 'admin')<br>authenticated: true<br>public: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin')<br>public: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin')<br>public: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin')<br>public: public.has_role(auth.uid(), 'admin') |
| `product_components` | enabled | authenticated: true<br>authenticated: public.has_role(auth.uid(), 'admin')<br>authenticated: true | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') |
| `product_group_components` | enabled | public: true<br>public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: true<br>authenticated: public.has_role(auth.uid(), 'admin'::public.app_role) | public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: public.has_role(auth.uid(), 'admin'::public.app_role) | public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: public.has_role(auth.uid(), 'admin'::public.app_role) | public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: public.has_role(auth.uid(), 'admin'::public.app_role) |
| `product_group_location_techniques` | enabled | public: true<br>public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: true<br>authenticated: public.has_role(auth.uid(), 'admin'::public.app_role) | public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: public.has_role(auth.uid(), 'admin'::public.app_role) | public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: public.has_role(auth.uid(), 'admin'::public.app_role) | public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: public.has_role(auth.uid(), 'admin'::public.app_role) |
| `product_group_locations` | enabled | public: true<br>public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: true<br>authenticated: public.has_role(auth.uid(), 'admin'::public.app_role) | public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: public.has_role(auth.uid(), 'admin'::public.app_role) | public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: public.has_role(auth.uid(), 'admin'::public.app_role) | public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: public.has_role(auth.uid(), 'admin'::public.app_role) |
| `product_group_members` | enabled | public: true<br>public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: public.has_role(auth.uid(), 'admin')<br>authenticated: true | public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: public.has_role(auth.uid(), 'admin') | public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: public.has_role(auth.uid(), 'admin') | public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: public.has_role(auth.uid(), 'admin') |
| `product_groups` | enabled | public: true<br>authenticated: public.has_role(auth.uid(), 'admin')<br>authenticated: true | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') |
| `product_novelties` | enabled | public: true<br>public: has_role(auth.uid(), 'admin')<br>public: true | public: has_role(auth.uid(), 'admin')<br>public: true | public: has_role(auth.uid(), 'admin')<br>public: true | public: has_role(auth.uid(), 'admin')<br>public: true |
| `product_price_freshness_overrides` | enabled | authenticated: true | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') |
| `product_sync_logs` | enabled | authenticated: public.has_role(auth.uid(), 'admin')<br>service_role: true<br>public: public.has_role(auth.uid(), 'admin') | service_role: true<br>public: public.has_role(auth.uid(), 'admin') | service_role: true | service_role: true |
| `product_views` | enabled | public: has_role(auth.uid(), 'admin')<br>public: seller_id = auth.uid()<br>authenticated: seller_id = auth.uid()<br>authenticated: public.has_role(auth.uid(), 'admin') | public: seller_id = auth.uid()<br>authenticated: seller_id = auth.uid() | — | — |
| `products` | enabled | public: true<br>authenticated: is_active = true<br>authenticated: public.has_role(auth.uid(), 'admin')<br>service_role: true | public: true<br>service_role: true | public: true<br>service_role: true | public: true<br>service_role: true |
| `profiles` | enabled | public: auth.uid() = user_id<br>authenticated: is_gerente_pa() AND pa_id = current_user_pa_id()<br>authenticated: is_gestor_compras() AND cooperativa_id = current_user_cooperativa_id()<br>authenticated: user_id = auth.uid() OR is_admin(auth.uid())<br>public: public.has_role(auth.uid(), 'admin') | public: auth.uid() = user_id<br>authenticated: user_id = auth.uid() | public: auth.uid() = user_id<br>public: public.has_role(auth.uid(), 'admin')<br>authenticated: user_id = auth.uid()<br>public: EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'supervisor'))<br>public: public.has_role((SELECT auth.uid()), 'admin'::public.app_role) OR public.has_role((SELECT auth.uid()), 'supervisor'::public.app_role | — |
| `public_token_failures` | enabled | authenticated: has_role(auth.uid(), 'admin'::app_role) | service_role: true | — | — |
| `push_subscriptions` | enabled | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id |
| `qa_release_evidences` | enabled | public: EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'diretoria'))<br>authenticated: has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role) | public: EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'diretoria'))<br>authenticated: has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role) | public: EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'diretoria')) | public: EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'diretoria')) |
| `qa_releases` | enabled | public: EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'diretoria'))<br>authenticated: has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role) | public: EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'diretoria'))<br>authenticated: has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role) | public: EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'diretoria')) | public: EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'diretoria')) |
| `qa_rls_audits` | enabled | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') |
| `qa_run_steps` | enabled | public: EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'diretoria'))<br>authenticated: has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role) | public: EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'diretoria'))<br>authenticated: has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role) | public: EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'diretoria'))<br>authenticated: has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role) | public: EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'diretoria'))<br>authenticated: has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role) |
| `qa_runs` | enabled | authenticated: public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dev') | authenticated: public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dev') | — | — |
| `query_telemetry` | enabled | authenticated: public.is_dev(auth.uid()) | authenticated: user_id = auth.uid() | — | authenticated: public.is_dev(auth.uid()) |
| `quote_approval_evidence_keys` | enabled | PUBLIC: false | PUBLIC: false | PUBLIC: false | PUBLIC: false |
| `quote_approval_tokens` | enabled | public: EXISTS ( SELECT 1 FROM quotes q WHERE q.id = quote_approval_tokens.quote_id AND (q.seller_id = auth.uid() OR has_role(auth.uid(), 'a<br>public: true<br>authenticated: public.can_view_all_sales() OR seller_id = auth.uid() | public: EXISTS ( SELECT 1 FROM quotes q WHERE q.id = quote_approval_tokens.quote_id AND (q.seller_id = auth.uid() OR has_role(auth.uid(), 'a<br>public: true<br>authenticated: public.can_view_all_sales() OR seller_id = auth.uid() | public: true<br>authenticated: public.can_view_all_sales() OR seller_id = auth.uid() | public: true<br>authenticated: public.can_view_all_sales() OR seller_id = auth.uid() |
| `quote_audit_logs` | enabled | authenticated: public.has_role(auth.uid(), 'admin')<br>authenticated: EXISTS ( SELECT 1 FROM public.quotes WHERE id = quote_audit_logs.quote_id AND seller_id = auth.uid() ) | — | — | — |
| `quote_comments` | enabled | public: EXISTS ( SELECT 1 FROM quotes WHERE quotes.id = quote_comments.quote_id AND (quotes.sales_rep_id = auth.uid() OR quotes.created_by =<br>authenticated: is_manager_or_admin()<br>authenticated: EXISTS ( SELECT 1 FROM public.quotes q WHERE q.id::text = quote_comments.quote_id AND q.seller_id = auth.uid() )<br>authenticated: user_id = auth.uid() OR public.is_admin(auth.uid()) | public: auth.uid() = user_id<br>authenticated: user_id = auth.uid() AND ( public.can_view_all_sales() OR EXISTS ( SELECT 1 FROM public.quotes q WHERE q.id::text = quote_com | authenticated: user_id = auth.uid() | authenticated: user_id = auth.uid() OR public.can_manage_quotes(auth.uid()) |
| `quote_consolidations` | enabled | public: EXISTS ( SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role IN ('gestor_compras', 'comprador_singular', 'admin' | public: EXISTS ( SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role IN ('gestor_compras', 'comprador_singular', 'admin' | public: EXISTS ( SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role IN ('gestor_compras', 'comprador_singular', 'admin' | public: EXISTS ( SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role IN ('gestor_compras', 'comprador_singular', 'admin' |
| `quote_history` | enabled | public: EXISTS ( SELECT 1 FROM quotes q WHERE q.id = quote_history.quote_id AND (q.seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::a<br>authenticated: EXISTS ( SELECT 1 FROM public.quotes q WHERE q.id = quote_history.quote_id AND ( q.seller_id = (SELECT auth.uid()) OR public. | public: EXISTS ( SELECT 1 FROM quotes q WHERE q.id = quote_history.quote_id AND (q.seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::a | — | — |
| `quote_item_personalizations` | enabled | authenticated: EXISTS ( SELECT 1 FROM public.quote_items qi JOIN public.quotes q ON q.id = qi.quote_id WHERE qi.id = quote_item_id AND (q.se<br>authenticated: EXISTS ( SELECT 1 FROM public.quote_items qi JOIN public.quotes q ON q.id = qi.quote_id WHERE qi.id = quote_item_id AND (q.se<br>public: can_view_all_sales() OR EXISTS ( SELECT 1 FROM public.quote_items qi JOIN public.quotes q ON q.id = qi.quote_id WHERE qi.id = quote_ | authenticated: EXISTS ( SELECT 1 FROM public.quote_items qi JOIN public.quotes q ON q.id = qi.quote_id WHERE qi.id = quote_item_id AND (q.se<br>public: can_view_all_sales() OR EXISTS ( SELECT 1 FROM public.quote_items qi JOIN public.quotes q ON q.id = qi.quote_id WHERE qi.id = quote_ | authenticated: EXISTS ( SELECT 1 FROM public.quote_items qi JOIN public.quotes q ON q.id = qi.quote_id WHERE qi.id = quote_item_id AND (q.se<br>public: can_view_all_sales() OR EXISTS ( SELECT 1 FROM public.quote_items qi JOIN public.quotes q ON q.id = qi.quote_id WHERE qi.id = quote_ | authenticated: EXISTS ( SELECT 1 FROM public.quote_items qi JOIN public.quotes q ON q.id = qi.quote_id WHERE qi.id = quote_item_id AND (q.se<br>public: can_view_all_sales() OR EXISTS ( SELECT 1 FROM public.quote_items qi JOIN public.quotes q ON q.id = qi.quote_id WHERE qi.id = quote_ |
| `quote_items` | enabled | authenticated: EXISTS ( SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND (q.seller_id = auth.uid() OR public.has_role(auth.uid(), 'ad<br>authenticated: EXISTS ( SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND (q.seller_id = auth.uid() OR public.has_role(auth.uid(), 'ad<br>public: can_view_all_sales() OR EXISTS ( SELECT 1 FROM public.quotes q WHERE q.id = quote_items.quote_id AND ( q.seller_id = auth.uid() OR ( | authenticated: EXISTS ( SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND (q.seller_id = auth.uid() OR public.has_role(auth.uid(), 'ad<br>public: can_view_all_sales() OR EXISTS ( SELECT 1 FROM public.quotes q WHERE q.id = quote_items.quote_id AND q.seller_id = auth.uid() ) | authenticated: EXISTS ( SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND (q.seller_id = auth.uid() OR public.has_role(auth.uid(), 'ad<br>public: can_view_all_sales() OR EXISTS ( SELECT 1 FROM public.quotes q WHERE q.id = quote_items.quote_id AND ( q.seller_id = auth.uid() OR ( | authenticated: EXISTS ( SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND (q.seller_id = auth.uid() OR public.has_role(auth.uid(), 'ad<br>public: can_view_all_sales() OR EXISTS ( SELECT 1 FROM public.quotes q WHERE q.id = quote_items.quote_id AND q.seller_id = auth.uid() ) |
| `quote_number_counters` | enabled | public: false | public: false | public: false | public: false |
| `quote_save_idempotency` | enabled | authenticated: (SELECT auth.uid()) = actor_id | authenticated: (SELECT auth.uid()) = actor_id AND EXISTS ( SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND q.seller_id = (SELECT aut | — | — |
| `quote_templates` | enabled | public: seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)<br>authenticated: public.can_view_all_sales() OR seller_id = auth.uid()<br>authenticated: is_public OR created_by = auth.uid() OR seller_id = auth.uid()<br>authenticated: created_by = auth.uid() OR seller_id = auth.uid()<br>authenticated: public.has_role(auth.uid(), 'admin') | public: seller_id = auth.uid()<br>authenticated: public.can_view_all_sales() OR seller_id = auth.uid()<br>authenticated: created_by = auth.uid() OR seller_id = auth.uid()<br>authenticated: public.has_role(auth.uid(), 'admin') | public: seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)<br>authenticated: public.can_view_all_sales() OR seller_id = auth.uid()<br>authenticated: created_by = auth.uid() OR seller_id = auth.uid()<br>authenticated: public.has_role(auth.uid(), 'admin') | public: seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)<br>authenticated: public.can_view_all_sales() OR seller_id = auth.uid()<br>authenticated: created_by = auth.uid() OR seller_id = auth.uid()<br>authenticated: public.has_role(auth.uid(), 'admin') |
| `quotes` | enabled | public: true<br>authenticated: seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin')<br>authenticated: (deleted_at IS NULL) AND (can_view_all_sales() OR (has_role(auth.uid(), 'supervisor'::app_role) AND ((organization_id IS NULL<br>authenticated: (deleted_at IS NULL) AND ((has_role(auth.uid(), 'gerente_pa'::app_role) AND (pa_id = get_user_pa_id())) OR (has_role(auth.uid | public: true<br>authenticated: seller_id = auth.uid()<br>authenticated: public.can_view_all_sales() OR seller_id = auth.uid() | public: true<br>authenticated: seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin')<br>authenticated: public.can_view_all_sales() OR (public.has_role(auth.uid(),'supervisor'::public.app_role) AND (organization_id IS NULL OR org | public: true<br>public: (seller_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)<br>authenticated: public.can_view_all_sales() OR seller_id = auth.uid() |
| `rate_limits` | enabled | public: true | — | — | — |
| `redis_config` | enabled | public: true | — | — | — |
| `request_rate_limits` | enabled | service_role: true<br>authenticated: public.is_dev(auth.uid()) | service_role: true | service_role: true | service_role: true |
| `rls_denial_log` | enabled | authenticated: is_supervisor_or_above(auth.uid()) | authenticated: false | authenticated: false | authenticated: is_admin_strict(auth.uid()) |
| `role_migration_batches` | enabled | authenticated: public.is_supervisor_or_above(auth.uid()) | authenticated: false | authenticated: false | authenticated: false |
| `role_migration_items` | enabled | authenticated: public.is_supervisor_or_above(auth.uid()) | authenticated: false | authenticated: false | authenticated: false |
| `role_permissions` | enabled | authenticated: has_role(auth.uid(), 'admin')<br>authenticated: true | authenticated: has_role(auth.uid(), 'admin') | authenticated: has_role(auth.uid(), 'admin') | authenticated: has_role(auth.uid(), 'admin') |
| `roles` | enabled | public: auth.role() = 'authenticated'<br>public: public.has_role(auth.uid(), 'admin'::app_role) | public: public.has_role(auth.uid(), 'admin'::app_role) | public: public.has_role(auth.uid(), 'admin'::app_role) | public: public.has_role(auth.uid(), 'admin'::app_role) |
| `sales_goals` | enabled | public: user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) | public: user_id = auth.uid() | public: user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) | public: user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) |
| `saved_filters` | enabled | authenticated: user_id = auth.uid() | authenticated: user_id = auth.uid() | authenticated: user_id = auth.uid() | authenticated: user_id = auth.uid() |
| `saved_trends_views` | enabled | authenticated: user_id = auth.uid() | authenticated: user_id = auth.uid() | authenticated: user_id = auth.uid() | authenticated: user_id = auth.uid() |
| `scheduled_exports` | enabled | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id |
| `scheduled_notifications` | enabled | public: auth.uid() = user_id | — | — | — |
| `scheduled_reports` | enabled | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id |
| `search_analytics` | enabled | authenticated: (SELECT auth.uid()) IS NOT NULL AND ( (SELECT auth.uid()) = user_id OR (SELECT public.is_manager_or_admin()) ) | authenticated: (SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = user_id | — | — |
| `secret_rotation_log` | enabled | authenticated: public.is_dev(auth.uid()) | public: has_role(auth.uid(), 'admin'::app_role) AND rotated_by = auth.uid() | — | — |
| `security_settings` | enabled | public: true<br>public: has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role) |
| `seller_achievements` | enabled | public: auth.uid() = user_id OR has_role(auth.uid(), 'admin') | public: auth.uid() = user_id | — | — |
| `seller_cart_items` | enabled | public: cart_id IN (SELECT id FROM public.seller_carts WHERE seller_id = auth.uid())<br>authenticated: EXISTS ( SELECT 1 FROM seller_carts c WHERE c.id = seller_cart_items.cart_id AND c.seller_id = auth.uid() ) | public: cart_id IN (SELECT id FROM public.seller_carts WHERE seller_id = auth.uid())<br>authenticated: EXISTS ( SELECT 1 FROM seller_carts c WHERE c.id = seller_cart_items.cart_id AND c.seller_id = auth.uid() ) | public: cart_id IN (SELECT id FROM public.seller_carts WHERE seller_id = auth.uid())<br>authenticated: EXISTS ( SELECT 1 FROM seller_carts c WHERE c.id = seller_cart_items.cart_id AND c.seller_id = auth.uid() ) | public: cart_id IN (SELECT id FROM public.seller_carts WHERE seller_id = auth.uid())<br>authenticated: EXISTS ( SELECT 1 FROM seller_carts c WHERE c.id = seller_cart_items.cart_id AND c.seller_id = auth.uid() ) |
| `seller_carts` | enabled | public: auth.uid() = seller_id<br>authenticated: seller_id = auth.uid() | public: auth.uid() = seller_id<br>authenticated: seller_id = auth.uid() | public: auth.uid() = seller_id<br>authenticated: seller_id = auth.uid() | public: auth.uid() = seller_id<br>authenticated: seller_id = auth.uid() |
| `seller_discount_limits` | enabled | authenticated: user_id = auth.uid()<br>authenticated: public.can_approve_discount(auth.uid()) | authenticated: public.can_approve_discount(auth.uid()) | authenticated: public.can_approve_discount(auth.uid()) | authenticated: public.can_approve_discount(auth.uid()) |
| `seller_gamification` | enabled | public: auth.uid() = user_id OR has_role(auth.uid(), 'admin') | public: auth.uid() = user_id | public: auth.uid() = user_id | — |
| `sensitive_access_logs` | enabled | authenticated: public.has_role(auth.uid(), 'admin') | — | — | — |
| `sicoob_approval_delegations` | enabled | authenticated: delegator_id = auth.uid() OR delegate_id = auth.uid() OR EXISTS ( SELECT 1 FROM public.user_roles actor_role WHERE actor_role | — | — | — |
| `sicoob_approval_deliveries` | enabled | PUBLIC: false | PUBLIC: false | PUBLIC: false | PUBLIC: false |
| `sicoob_approval_delivery_archive` | enabled | PUBLIC: false | PUBLIC: false | PUBLIC: false | PUBLIC: false |
| `sicoob_approval_policies` | enabled | authenticated: EXISTS ( SELECT 1 FROM public.user_roles ur JOIN public.profiles p ON p.user_id = ur.user_id OR p.id = ur.user_id WHERE ur.us | authenticated: EXISTS ( SELECT 1 FROM public.user_roles ur JOIN public.profiles p ON p.user_id = ur.user_id OR p.id = ur.user_id WHERE ur.us | authenticated: EXISTS ( SELECT 1 FROM public.user_roles ur JOIN public.profiles p ON p.user_id = ur.user_id OR p.id = ur.user_id WHERE ur.us | authenticated: EXISTS ( SELECT 1 FROM public.user_roles ur JOIN public.profiles p ON p.user_id = ur.user_id OR p.id = ur.user_id WHERE ur.us |
| `sicoob_approval_requests` | enabled | public: auth.uid() = requester_id<br>public: EXISTS ( SELECT 1 FROM profiles WHERE id = auth.uid() AND (role IN ('supervisor', 'dev', 'gestor_compras') OR (role = 'gerente_pa' A<br>authenticated: requester_id = auth.uid() OR approver_id = auth.uid() OR public.sicoob_current_actor_can_read_order(order_id) | public: auth.uid() = requester_id | authenticated: requester_id = auth.uid() OR public.sicoob_current_actor_can_approve_order(order_id, false) | — |
| `sicoob_approval_worker_dispatches` | enabled | PUBLIC: false | PUBLIC: false | PUBLIC: false | PUBLIC: false |
| `sicoob_budget_audit` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `sicoob_centrais` | enabled | public: auth.role() = 'authenticated' | — | — | — |
| `sicoob_delivery_allocations` | enabled | authenticated: public.sicoob_current_actor_can_receive_destination(destination_id) OR EXISTS ( SELECT 1 FROM public.sicoob_delivery_destinat | — | — | — |
| `sicoob_delivery_destinations` | enabled | authenticated: public.sicoob_current_actor_can_view_all_consolidation(consolidation_id) OR public.sicoob_current_actor_can_receive_destinati | — | — | — |
| `sicoob_delivery_receipt_events` | enabled | authenticated: EXISTS ( SELECT 1 FROM public.sicoob_delivery_allocations a JOIN public.sicoob_delivery_destinations d ON d.id = a.destinatio | — | — | — |
| `sicoob_document_registry` | enabled | authenticated: public.sicoob_current_actor_can_manage_fulfillment(order_id) | — | — | — |
| `sicoob_invitation_events` | forced | authenticated: actor_id = auth.uid() OR target_user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.sicoob_current_actor_can_issue_ | — | — | — |
| `sicoob_invitations` | forced | authenticated: invited_by = auth.uid() OR accepted_by = auth.uid() OR public.is_admin(auth.uid()) OR public.sicoob_current_actor_can_issue_i | — | — | — |
| `sicoob_kit_quote_requests` | enabled | authenticated: actor_id = auth.uid() | — | — | — |
| `sicoob_manager_audit` | enabled | public: auth.uid() = manager_id<br>public: public.has_role(auth.uid(), 'admin') | — | — | — |
| `sicoob_order_artwork_versions` | enabled | authenticated: public.sicoob_current_actor_can_read_order(order_id) | — | — | — |
| `sicoob_order_history` | enabled | authenticated: has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role) OR EXISTS (SELECT 1 FROM public.sicoob_orders <br>authenticated: public.sicoob_current_actor_can_read_order(order_id) | public: auth.uid() = user_id | — | — |
| `sicoob_order_invoices` | enabled | authenticated: public.sicoob_current_actor_can_read_order(order_id) | — | — | — |
| `sicoob_order_item_logs` | enabled | authenticated: has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role) OR EXISTS (SELECT 1 FROM public.sicoob_orders <br>authenticated: public.sicoob_current_actor_can_read_order(order_id) | — | — | — |
| `sicoob_order_items` | enabled | public: EXISTS ( SELECT 1 FROM public.sicoob_orders o WHERE o.id = sicoob_order_items.order_id AND ( o.pa_id = public.current_user_pa_id() O<br>authenticated: public.sicoob_current_actor_can_read_order(order_id) | — | — | — |
| `sicoob_order_payments` | enabled | authenticated: public.sicoob_current_actor_can_read_order(order_id) | — | — | — |
| `sicoob_order_shipments` | enabled | authenticated: public.sicoob_current_actor_can_read_order(order_id) | — | — | — |
| `sicoob_orders` | enabled | authenticated: is_admin(auth.uid())<br>public: (has_role(auth.uid(), 'gerente_pa') AND pa_id = get_user_pa_id()) OR (has_role(auth.uid(), 'comprador_pac') AND pa_id = get_user_pa_<br>authenticated: public.sicoob_current_actor_can_read_order(id) | authenticated: is_admin(auth.uid()) | authenticated: is_admin(auth.uid()) | authenticated: is_admin(auth.uid()) |
| `sicoob_performance_reports` | enabled | public: public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dev') | — | — | — |
| `sicoob_quote_reorder_requests` | enabled | authenticated: actor_id = auth.uid() | — | — | — |
| `sicoob_reorder_requests` | enabled | authenticated: actor_id = auth.uid() | — | — | — |
| `sicoob_rls_audit_logs` | enabled | public: public.has_role(auth.uid(), 'admin')<br>public: EXISTS ( SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'diretoria') )<br>authenticated: (SELECT public.can_view_audit_logs((SELECT auth.uid()))) | — | — | — |
| `sicoob_temas` | enabled | public: true | — | — | — |
| `simulator_wizard_drafts` | enabled | public: auth.uid() = user_id<br>authenticated: user_id = auth.uid() | public: auth.uid() = user_id<br>authenticated: user_id = auth.uid() | public: auth.uid() = user_id<br>authenticated: user_id = auth.uid() | public: auth.uid() = user_id<br>authenticated: user_id = auth.uid() |
| `singulares` | enabled | authenticated: has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role) | authenticated: has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role) | authenticated: has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role) | authenticated: has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role) |
| `step_up_audit_log` | enabled | public: public.is_dev(auth.uid())<br>public: auth.uid() = user_id | — | — | — |
| `step_up_challenges` | enabled | public: auth.uid() = user_id | — | — | — |
| `step_up_tokens` | enabled | public: auth.uid() = user_id | — | — | — |
| `store_rewards` | enabled | public: auth.uid() IS NOT NULL AND is_active = true | — | — | — |
| `suppliers` | enabled | public: true | public: true | public: true | public: true |
| `sync_jobs` | enabled | public: auth.uid() = created_by | — | — | — |
| `system_settings` | enabled | authenticated: true<br>public: auth.role() = 'authenticated'<br>public: EXISTS ( SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'dev') )<br>authenticated: public.is_supervisor_or_above(auth.uid())<br>authenticated: public.is_supervisor_or_above(auth.uid()) | public: EXISTS ( SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'dev') )<br>authenticated: public.is_supervisor_or_above(auth.uid()) | public: EXISTS ( SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'dev') )<br>authenticated: public.is_supervisor_or_above(auth.uid()) | public: EXISTS ( SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'dev') )<br>authenticated: public.is_supervisor_or_above(auth.uid()) |
| `telemetry_events` | enabled | public: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('dev', 'supervisor', 'gestor_compras') )<br>authenticated: public.is_supervisor_or_above(auth.uid()) | public: true<br>authenticated: true | — | — |
| `telemetry_logs` | enabled | authenticated: has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role)<br>authenticated: auth.uid() = user_id | public: true<br>authenticated: auth.uid() = user_id | — | — |
| `telemetry_query_performance` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `template_versions` | enabled | public: true | — | — | — |
| `test_suites_runs` | enabled | public: auth.jwt() ->> 'role' = 'service_role' OR EXISTS ( SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' ) | public: auth.jwt() ->> 'role' = 'service_role' OR EXISTS ( SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' ) | public: auth.jwt() ->> 'role' = 'service_role' OR EXISTS ( SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' ) | public: auth.jwt() ->> 'role' = 'service_role' OR EXISTS ( SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' ) |
| `two_factor_secrets` | enabled | public: true | — | — | — |
| `user_2fa_settings` | enabled | public: auth.uid() = user_id<br>public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id |
| `user_allowed_ips` | enabled | public: auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role)<br>public: auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role) | public: auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role) | public: auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role) | public: auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role) |
| `user_comparisons` | enabled | public: auth.uid() = user_id<br>public: is_public = true AND share_token IS NOT NULL AND (share_expires_at IS NULL OR share_expires_at > now()) | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id |
| `user_filter_presets` | enabled | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id |
| `user_known_devices` | enabled | public: auth.uid() = user_id<br>public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id |
| `user_onboarding` | enabled | public: auth.uid() = user_id<br>public: auth.uid() = user_id<br>authenticated: user_id = auth.uid() | public: auth.uid() = user_id<br>public: auth.uid() = user_id<br>authenticated: user_id = auth.uid() | public: auth.uid() = user_id<br>public: auth.uid() = user_id<br>authenticated: user_id = auth.uid() | public: auth.uid() = user_id<br>authenticated: user_id = auth.uid() |
| `user_passkeys` | enabled | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id |
| `user_preferences` | enabled | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id | — |
| `user_rewards` | enabled | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id | — |
| `user_roles` | enabled | authenticated: user_id = auth.uid()<br>authenticated: auth.uid() = user_id<br>public: public.has_role(auth.uid(), 'admin')<br>authenticated: public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin') | authenticated: public.is_admin_strict(auth.uid())<br>public: public.has_role(auth.uid(), 'admin') | authenticated: public.is_admin_strict(auth.uid())<br>public: public.has_role(auth.uid(), 'admin') | authenticated: public.is_admin_strict(auth.uid())<br>public: public.has_role(auth.uid(), 'admin') |
| `v_full_scope_grants` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `v_sicoob_hierarchy` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `video_variant_links` | enabled | authenticated: true<br>authenticated: has_role(auth.uid(), 'admin') | authenticated: has_role(auth.uid(), 'admin') | authenticated: has_role(auth.uid(), 'admin') | authenticated: has_role(auth.uid(), 'admin') |
| `voice_command_logs` | enabled | authenticated: auth.uid() = user_id<br>authenticated: public.is_manager_or_admin() | authenticated: auth.uid() = user_id | — | — |
| `webhook_configs` | enabled | PUBLIC: false | PUBLIC: false | PUBLIC: false | PUBLIC: false |
| `webhook_deliveries` | enabled | public: public.has_role(auth.uid(), 'admin') | — | — | public: public.has_role(auth.uid(), 'admin') |
| `webhook_delivery_metrics` | enabled | anon: false<br>authenticated: public.has_role(auth.uid(), 'dev'::app_role) OR public.has_role(auth.uid(), 'supervisor'::app_role) | anon: false<br>authenticated: false | anon: false<br>authenticated: false | anon: false<br>authenticated: false |
| `webhook_logs` | enabled | authenticated: EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text IN ('admin','dev')) | — | — | — |
| `webhook_retry_claims` | enabled | PUBLIC: false | PUBLIC: false | PUBLIC: false | PUBLIC: false |
| `websocket_sessions` | enabled | public: true | — | — | — |
| `workspace_notifications` | enabled | authenticated: user_id = auth.uid()<br>public: auth.uid() = user_id | authenticated: user_id = auth.uid() | authenticated: user_id = auth.uid()<br>public: auth.uid() = user_id | authenticated: user_id = auth.uid()<br>public: auth.uid() = user_id |

> `—` com RLS ligado = ninguém além de service_role. `sem RLS` = qualquer chave anon lê/escreve tudo.

## Onde o RLS é IGNORADO (service_role) — 295 arquivo(s)

- `docs/execucao/auditoria-planejamento-2026-10-13/reproducao/sicoob_simulacoes_auditoria.py`
- `docs/execucao/auditoria-planejamento-2026-10-13/reproducao/sicoob_simular_rls_20261013.py`
- `docs/execucao/evidencias/sicoob_reconciliacao_restante_20260916.sql`
- `docs/plano-implementacao/plano-copiloto-vendas-sussurro-150-etapas-20261016/motor-nao-executado/edge/copilot-analyze.index.ts`
- `docs/plano-implementacao/plano-copiloto-vendas-sussurro-150-etapas-20261016/motor-nao-executado/edge/copilot-quote-context.index.ts`
- `docs/plano-implementacao/plano-copiloto-vendas-sussurro-150-etapas-20261016/motor-nao-executado/edge/copilot-suggest.index.ts`
- `e2e/helpers/cleanup-client.ts`
- `scripts/ai-context/cenarios.mjs`
- `scripts/ai-context/gerar.unit.mjs`
- `scripts/check-edge-authorization.mjs`
- `scripts/check-security-definer-acl.mjs`
- `scripts/db-performance-audit.mjs`
- `scripts/db/apply-sicoob-migrations.mjs`
- `scripts/db/check-live-api-inventory.mjs`
- `scripts/db/check-runtime-refs.mjs`
- `scripts/e2e-cleanup.mjs`
- `scripts/e2e-target.mjs`
- `scripts/enterprise-dossier-builder.mjs`
- `scripts/generate-audit-dossier.mjs`
- `scripts/generate-enterprise-report.mjs`
- `scripts/inventario/gerar-banco.mjs`
- `scripts/qa/simular-acl-efetiva.py`
- `scripts/qa/simular-agendamento-outbox.py`
- `scripts/qa/simular-aprovacao-publica.py`
- `scripts/qa/simular-consolidacao-orcamentos.py`
- `scripts/qa/simular-controles-auditoria.py`
- `scripts/qa/simular-conversao-pedido-sicoob.py`
- `scripts/qa/simular-convites-sicoob.py`
- `scripts/qa/simular-documentos-sicoob.py`
- `scripts/qa/simular-escopo-orcamento-ativo.py`
- `scripts/qa/simular-financeiro-arte-sicoob.py`
- `scripts/qa/simular-kit-orcamento-sicoob.py`
- `scripts/qa/simular-logistica-canonica.py`
- `scripts/qa/simular-notification-preferences-auth.py`
- `scripts/qa/simular-outbox-aprovacao.py`
- `scripts/qa/simular-reacoes-favoritos-rls.py`
- `scripts/qa/simular-recompra-sicoob.py`
- `scripts/qa/simular-salvamento-orcamento-atomico.py`
- `scripts/qa/simular-taxonomia-marketing.py`
- `scripts/qa/simular-webhook-internal-auth.py`
- `scripts/regras_negocio/generate.py`
- `scripts/scan-rls-security.mjs`
- `scripts/seed-qa.mjs`
- `scripts/supabase_snapshot/snapshot.py`
- `scripts/test-rls-compliance.mjs`
- `scripts/test-rls.mjs`
- `scripts/validate-e2e-target.mjs`
- `sicoob_rls_validation.sql`
- `src/components/admin/connections/ConnectionRowSourceBadge.tsx`
- `src/components/admin/connections/DataSourceDebugTab.tsx`
- `src/components/admin/connections/ExpectedKeysMatchPanel.tsx`
- `src/components/admin/connections/KeysValidationTab.tsx`
- `src/components/admin/connections/SupabaseConnectionsTab.tsx`
- `src/components/admin/connections/secretImpactMap.ts`
- `src/components/admin/connections/secretNormalizers.ts`
- `src/components/admin/connections/secretValidators.ts`
- `src/components/admin/connections/secretWhitelist.ts`
- `src/lib/sensitive-masking.ts`
- `src/pages/admin/AdminConexoesStatusPage.tsx`
- `src/pages/admin/OwnershipAuditAdminPage.tsx`
- `supabase/cron/cron-config.sql`
- `supabase/functions/_shared/ai-usage.ts`
- `supabase/functions/_shared/audit-log.ts`
- `supabase/functions/_shared/auth.ts`
- `supabase/functions/_shared/authorize.ts`
- `supabase/functions/_shared/bot-protection.ts`
- `supabase/functions/_shared/catalog-client.ts`
- `supabase/functions/_shared/connection-test-runner.ts`
- `supabase/functions/_shared/credentials.test.ts`
- `supabase/functions/_shared/credentials.ts`
- `supabase/functions/_shared/edge-authz-manifest.ts`
- `supabase/functions/_shared/external-db-telemetry.ts`
- `supabase/functions/_shared/internal-service-auth.ts`
- `supabase/functions/admin-audit-hook/index.ts`
- `supabase/functions/auth-integrity-check/index.ts`
- `supabase/functions/bi-share-dossier/contract.ts`
- `supabase/functions/bitrix-sync/index.ts`
- `supabase/functions/block-ip-temporarily/index.ts`
- `supabase/functions/cleanup-notifications/index.ts`
- `supabase/functions/collections-public-react/index.ts`
- `supabase/functions/collections-watcher/index.ts`
- `supabase/functions/comparison-price-watcher/index.ts`
- `supabase/functions/comparisons-public-react/index.ts`
- `supabase/functions/connection-tester/index.ts`
- `supabase/functions/connections-auto-test/index.ts`
- `supabase/functions/connections-health-check/index.ts`
- `supabase/functions/connections-hub-audit/index.ts`
- `supabase/functions/crm-db-bridge/creds_health.test.ts`
- `supabase/functions/crm-db-bridge/index.ts`
- `supabase/functions/detect-new-device/index.ts`
- `supabase/functions/e2e-cleanup/index.ts`
- `supabase/functions/error-monitor/index.ts`
- `supabase/functions/expert-chat/index.ts`
- `supabase/functions/external-db-bridge/index.ts`
- `supabase/functions/favorites-public-react/index.ts`
- `supabase/functions/favorites-watcher/index.ts`
- `supabase/functions/force-global-logout/index.ts`
- `supabase/functions/full-op-diagnostics/index.ts`
- `supabase/functions/generate-mockup/index.ts`
- `supabase/functions/github-credentials-test/index.ts`
- `supabase/functions/kit-public-view/index.ts`
- `supabase/functions/log-login-attempt/index.ts`
- `supabase/functions/manage-users/index.ts`
- `supabase/functions/mcp-keys-issue/index.ts`
- `supabase/functions/mcp-keys-issue/rls-isolation.test.ts`
- `supabase/functions/mcp-keys-revoke/index.ts`
- `supabase/functions/mcp-keys-rotate/index.ts`
- `supabase/functions/mcp-keys-update/index.ts`
- `supabase/functions/mcp-server/index.ts`
- `supabase/functions/monthly-health-report/index.ts`
- `supabase/functions/ownership-audit/index.ts`
- `supabase/functions/process-batch-export/index.ts`
- `supabase/functions/process-queue/index.ts`
- `supabase/functions/process-scheduled-reports/index.ts`
- `supabase/functions/qa-block-monitor/index.ts`
- `supabase/functions/quote-approval/index.ts`
- `supabase/functions/quote-followup-reminders/index.ts`
- `supabase/functions/quote-price-attestation/handler.ts`
- `supabase/functions/quote-sync/index.ts`
- `supabase/functions/rls-audit/index.ts`
- `supabase/functions/rls-integration-tests/index.ts`
- `supabase/functions/rls-matrix-export/index.ts`
- `supabase/functions/secrets-manager/index.ts`
- `supabase/functions/secrets-manager/list-contract.test.ts`
- `supabase/functions/semantic-search/index.ts`
- `supabase/functions/send-digest/index.ts`
- `supabase/functions/send-notification/index.ts`
- `supabase/functions/send-scheduled-reports/index.ts`
- `supabase/functions/sicoob-approval-notifications/index.ts`
- `supabase/functions/sicoob-artwork-register/index.ts`
- `supabase/functions/sicoob-document-ingest/index.ts`
- `supabase/functions/sicoob-kit-quote/index.ts`
- `supabase/functions/sicoob-reorder/index.ts`
- `supabase/functions/sicoob-seed-qa/index.ts`
- `supabase/functions/sicoob-seed/index.ts`
- `supabase/functions/step-up-verify/index.ts`
- `supabase/functions/sync-quote-bitrix/index.ts`
- `supabase/functions/system-healthcheck/index.ts`
- `supabase/functions/validate-access/index.ts`
- `supabase/functions/webhook-dispatcher/index.ts`
- `supabase/functions/webhook-inbound/index.ts`
- `supabase/migrations/20251214200524_1f519508-285c-4649-ba22-b40d67618e67.sql`
- `supabase/migrations/20260219133353_4495e564-cec8-44b1-a590-1fb18ca8c91d.sql`
- `supabase/migrations/20260301000000_fix_cleanup_old_notifications_drop.sql`
- `supabase/migrations/20260314133410_b4a5983b-76fc-4419-b422-a590dc0fa2ed.sql`
- `supabase/migrations/20260323164400_3d7928d1-f21a-4599-b4a4-0af60c245542.sql`
- `supabase/migrations/20260406202212_20735579-941a-46d2-b872-abe769fe774a.sql`
- `supabase/migrations/20260407014300_2724b8ff-1566-4bf2-b056-833e45cf0b85.sql`
- `supabase/migrations/20260416183342_786cf75e-5ec6-4c53-a314-9b622e8b7027.sql`
- `supabase/migrations/20260416183415_d7c7a7a0-725a-471b-8c3d-424230285729.sql`
- … +145 (lista completa em `context.json`)

## Funções SQL `SECURITY DEFINER` (rodam com privilégio do dono, ignoram RLS)

- `_can_act_on_behalf_of_others`
- `accept_sicoob_invitation`
- `acquire_ai_quota`
- `add_product_novelty`
- `add_sicoob_order_invoice`
- `allocate_sicoob_consolidation_by_order_pa`
- `append_quote_history_note`
- `apply_local_quote_approval_response`
- `approve_quote_with_pdf_atomic`
- `approve_sicoob_order`
- `archive_sicoob_approval_deliveries`
- `assert_quote_content_editable`
- `assert_quote_transition`
- `assert_sicoob_approval_actor`
- `audit_actor_email`
- `audit_all_rls_compliance`
- `audit_empty_rls_policies`
- `audit_mcp_api_keys_changes`
- `audit_ownership_orphans`
- `audit_rls_coverage`
- `audit_rls_matrix`
- `audit_sicoob_order_item_changes`
- `audit_sicoob_order_status_change`
- `audit_sicoob_rls_policies`
- `audit_trigger_func`
- `audit_user_role_changes`
- `auto_block_extreme_offenders`
- `auto_revoke_orphan_full_keys`
- `bulk_update_quote_status_atomic`
- `can_approve_discount`
- `can_grant_mcp_full`
- `can_manage`
- `can_manage_connections`
- `can_manage_quote_scope`
- `can_manage_quotes`
- `can_view_all_sales`
- `can_view_audit_logs`
- `can_view_connections`
- `can_view_telemetry`
- `capture_sicoob_order_approval_policy`
- `check_ai_quota`
- `check_budget_availability`
- `check_hardening_status`
- `check_ip_access`
- `check_mcp_abuse_threshold`
- `check_order_constraints_trigger`
- `check_rate_limit`
- `check_rls_enabled`
- `check_security_health`
- `check_seller_cart_limit`
- `check_sicoob_access_matrix`
- `check_tables_rls`
- `check_telemetry_regression`
- `claim_next_optimization`
- `claim_sicoob_approval_delivery`
- `claim_sicoob_export_jobs`
- `cleanup_discount_test_data`
- `cleanup_expired_collection_trash`
- `cleanup_expired_favorite_trash`
- `cleanup_expired_novelties`
- `cleanup_expired_public_comparisons`
- `cleanup_expired_step_up`
- `cleanup_old_notifications`
- `cleanup_rate_limits`
- `cleanup_security_logs`
- `cleanup_test_auth_orphans`
- `cleanup_webhook_logs`
- `complete_optimization`
- `confirm_sicoob_order`
- `consolidate_sicoob_quotes`
- `consume_quote_price_attestation`
- `consume_step_up_token`
- `convert_quote_to_sicoob_order`
- `create_default_notification_preferences`
- `create_organization_with_owner`
- `create_quote_version_atomic`
- `create_sicoob_approval_delegation`
- `create_sicoob_kit_quote`
- `create_sicoob_order_artwork_version`
- `create_sicoob_order_consolidation`
- `current_user_cooperativa_id`
- `current_user_pa_id`
- `decide_sicoob_order_artwork`
- `dispatch_quote_webhook_event`
- `dispatch_sicoob_approval_worker`
- `dispatch_sicoob_connections_auto_test`
- `dispatch_sicoob_connections_health_check`
- `dispatch_sicoob_export_worker`
- `dispatch_sicoob_external_db_keepalive`
- `dispatch_sicoob_order_consolidation`
- `duplicate_order_atomic`
- `e2e_cleanup_check_rate_limit`
- `enforce_created_by_owner`
- `enforce_seller_id_owner`
- `enforce_user_id_owner`
- `enqueue_due_sicoob_scheduled_exports`
- `enqueue_optimization`
- `enqueue_sicoob_approval_event`
- `enqueue_sicoob_approval_notifications`
- `ensure_admin_audit_log_partitions`
- `ensure_default_favorite_list`
- `execute_role_migration_batch`
- `fill_integration_credential_metadata`
- `finish_sicoob_approval_delivery`
- `fn_audit_config_change`
- `fn_audit_order_status_change`
- `freeze_sicoob_order_while_approval_pending`
- `generate_order_number`
- `generate_quote_number`
- `generate_secure_token`
- `generate_sicoob_performance_report`
- `get_active_novelties`
- `get_app_health_summary`
- `get_auto_test_job_status`
- `get_bundle_suggestions`
- `get_client_seasonality`
- `get_client_top_products`
- `get_collections_weekly_count`
- `get_color_filters`
- `get_connection_failure_window_minutes`
- `get_connections_auto_test_interval`
- `get_connections_hub_operational_evidence`
- `get_enum_values`
- `get_favorites_weekly_count`
- `get_industry_benchmark_stats`
- `get_industry_seasonality`
- `get_industry_top_products`
- `get_novelties_stats`
- `get_platform_failure_metrics`
- `get_public_favorite_list`
- `get_public_favorite_reactions`
- `get_public_quote_approval`
- `get_query_telemetry_p95`
- `get_quote_save_idempotent_replay`
- `get_quote_token_by_value`
- `get_record_history`
- `get_sicoob_access_state`
- `get_sicoob_approval_delivery_summary`
- `get_sicoob_consolidation_sellers`
- `get_sicoob_invitation`
- `get_sicoob_kit_quote_idempotency`
- `get_sicoob_order_approval_policy`
- `get_sicoob_quote_reorder_idempotency`
- `get_sicoob_reorder_idempotency`
- `get_test_auth_integrity`
- `get_top_collected_products`
- `get_top_compared_products`
- `get_top_favorited_products`
- `get_unread_count`
- `get_user_cooperative_id`
- `get_user_org_ids`
- `get_user_pa_id`
- `get_user_recent_comparisons`
- `get_user_role`
- `get_user_singular_id`
- `guard_mcp_api_keys_writes`
- `guard_quote_item_content_write`
- `guard_quote_personalization_content_write`
- `guard_quote_price_attestation`
- `guard_sicoob_approval_request_insert`
- `guard_sicoob_approval_status_transition`
- `handle_new_user`
- `has_org_role`
- `has_role`
- `increment_kit_template_usage`
- `increment_row_version`
- `increment_webhook_endpoint_metrics`
- `inspect_query_plan`
- `invalidate_used_approval_token`
- `is_admin`
- `is_admin_strict`
- `is_dev`
- `is_dnd_active`
- `is_gerente_pa`
- `is_gestor_compras`
- `is_kit_collaborator`
- `is_kit_owner`
- `is_manager_or_admin`
- `is_order_owner_or_admin`
- `is_org_member`
- `is_seller_only`
- `is_singular_buyer_for_quote`
- `is_supervisor_or_above`
- `is_vendedor`
- `is_vendedor_role`
- `issue_sicoob_invitation`
- `list_sicoob_approval_delegate_candidates`
- `log_access_denied`
- `log_admin_action`
- `log_full_scope_grant`
- `log_mcp_key_revocation`
- `log_mockup_prompt_change`
- `log_order_audit_event`
- `log_order_status_change`
- `log_quote_action`
- `log_quote_status_change`
- `log_rls_denial`
- `log_sicoob_admin_action`
- `lookup_request_id`
- `mark_all_notifications_read`
- `mark_notification_read`
- `mark_overdue_sicoob_payments`
- `mark_step_up_password_verified`
- `mcp_audit_actor`
- `monitor_sicoob_approval_worker`
- `move_collection_item_to_trash`
- `move_favorite_to_trash`
- `mutate_sicoob_order_item`
- `normalize_quote_parent_root`
- `notify_approval_status_change`
- `notify_discount_approval_request`
- `notify_hardening_regression`
- `notify_new_order`
- `notify_order_status_change`
- `notify_quote_client_response`
- `notify_quote_status_change`
- `notify_singular_quote_submission`
- `pa_belongs_to_user_singular`
- `permanent_delete_record`
- `prepare_sicoob_order_confirmation`
- `prevent_profile_role_change`
- `prevent_role_self_update`
- `protect_latest_quote_version_deletion`
- `protect_sicoob_approval_delegation`
- `protect_sicoob_approval_policy_version`
- `protect_sicoob_approval_request`
- `protect_sicoob_consolidation_records`
- `protect_sicoob_order_artwork_version`
- `protect_sicoob_order_consolidation_link`
- `protect_sicoob_order_payment`
- `provision_qa_accounts`
- `qa_preflight_check`
- `queue_sicoob_approval_escalation`
- `queue_sicoob_approval_notifications`
- `quote_approval_content_snapshot`
- `quote_approval_public_items`
- `reconcile_sicoob_approval_delivery`
- `record_dev_route_telemetry`
- `record_mcp_access_violation`
- `record_platform_failure`
- `record_public_token_failure`
- `record_quote_bitrix_sync`
- `record_sicoob_delivery_receipt`
- `record_sicoob_order_payment`
- `record_sicoob_order_status_event`
- `refresh_mv_benchmark_setorial`
- `refresh_sicoob_reorder_quote`
- `refund_sicoob_order_payment`
- `register_quote_price_attestation`
- `register_sicoob_clean_document`
- `reject_sicoob_order`
- `reject_sicoob_order_without_approval`
- `reorder_sicoob_order_as_quote`
- `reorder_sicoob_order_as_quote_legacy_20260927`
- `reorder_sicoob_quote_as_quote`
- `repair_ownership_orphans`
- `request_discount_approval_atomic`
- `request_sicoob_order_approval`
- `request_step_up_challenge`
- `require_sicoob_artwork_before_production`
- `require_sicoob_invitation_account`
- `reset_optimization_queue`
- `resolve_sicoob_approval_authority`
- `respond_discount_approval_atomic`
- `restore_record`
- `retry_failed_webhook_deliveries`
- `retry_own_sicoob_export_job`
- `revoke_sicoob_approval_delegation`
- `revoke_sicoob_invitation`
- `revoke_sicoob_user_access`
- `rotate_quote_approval_evidence_key`
- `search_products_semantic`
- `search_records_rerank`
- `seed_discount_test_users`
- `seed_qa_scenario`
- `send_notification`
- `set_connection_failure_window_minutes`
- `set_connections_auto_test_interval`
- `set_custom_kit_pinned`
- `set_quote_hierarchy`
- `sicoob_actor_can_approve`
- `sicoob_actor_can_manage_consolidation`
- `sicoob_actor_can_manage_finance`
- `sicoob_actor_can_manage_fulfillment`
- `sicoob_actor_can_receive_consolidation`
- `sicoob_actor_can_receive_destination`
- `sicoob_actor_can_request_approval`
- `sicoob_actor_can_view_all_consolidation`
- `sicoob_actor_has_active_approval_delegation`
- `sicoob_actor_is_active`
- `sicoob_assert_current_reorder_items`
- `sicoob_current_actor_approval_authority`
- `sicoob_current_actor_can_approve_order`
- `sicoob_current_actor_can_issue_invitation`
- `sicoob_current_actor_can_manage_consolidation`
- `sicoob_current_actor_can_manage_fulfillment`
- `sicoob_current_actor_can_read_order`
- `sicoob_current_actor_can_receive_consolidation`
- `sicoob_current_actor_can_receive_destination`
- `sicoob_current_actor_can_view_all_consolidation`
- `sicoob_export_orders_for_actor`
- `sicoob_inviter_can_issue`
- `snapshot_hardening_status`
- `soft_delete_record`
- `submit_quote_response`
- `submit_signed_quote_response`
- `sync_external_connections_from_credentials`
- `trg_auto_revoke_mcp_on_role_loss`
- `trg_sync_external_connections`
- `trim_connection_test_history`
- `upsert_sicoob_order_shipment`
- `validate_discount_approval_status`
- `validate_ip_access_control`
- `validate_mcp_key`
- `validate_order_status`
- `validate_quote_real_discount`
- `validate_scheduled_report_email`
- `validate_secret_rotation_action_type`
- `validate_sicoob_approval_delegate_role`
- `validate_sicoob_order_budget`
- `validate_sicoob_order_document`
- `validate_status_fields`
- `verify_quote_approval_signature`
- `verify_step_up_otp`

## Edge functions públicas (sem JWT — qualquer um chama)

- `expert-chat`
- `external-db-bridge`
- `crm-db-bridge`
- `migrate-helper`
- `sicoob-approval-notifications`
- `quote-approval`
- `send-notification`
- `process-batch-export`
- `monthly-health-report`
- `cleanup-notifications`
- `process-queue`
- `send-digest`
- `process-scheduled-reports`
- `send-scheduled-reports`
- `quote-followup-reminders`
- `connections-health-check`
- `collections-watcher`
- `favorites-watcher`
- `comparison-price-watcher`
- `ownership-audit`
- `webhook-dispatcher`
- `health-check`

## Rotas protegidas no front

| Rota | Guard | Roles | Arquivo |
|---|---|---|---|
| /app | ProtectedRoute |  | `scripts/ai-context/gerar.unit.mjs` |
| /privada | ProtectedRoute |  | `scripts/ai-context/gerar.unit.mjs` |

Guards usados: AdminRoute, Protected, ProtectedRoute

Middleware matcher (Next.js): nenhum

## Grants / Revokes (agrupados por role e privilégio)

| Ação | Para/De | Privilégios | Objetos |
|---|---|---|---|
| grant | anon, authenticated | execute | `get_sicoob_invitation` |
| grant | anon, authenticated, service_role | execute | `search_products_semantic`, `get_public_quote_approval`, `submit_quote_response`, `submit_signed_quote_response`, `get_quote_token_by_value`, `set_postgrest_request_timeout`, `get_public_favorite_list`, `get_public_favorite_reactions`, `get_public_favorite_reactions` |
| grant | authenticated | execute | `seed_discount_test_users`, `cleanup_discount_test_data`, `get_bundle_suggestions`, `get_client_top_products`, `get_industry_top_products`, `get_industry_benchmark_stats`, `get_web_vitals_summary`, `check_hardening_status`, `get_top_favorited_products`, `get_favorites_weekly_count`, `set_connections_auto_test_interval`, `get_connections_auto_test_interval`, `set_connection_failure_window_minutes`, `get_connection_failure_window_minutes`, `get_auto_test_job_status` … +124 |
| grant | authenticated | insert, select | `telemetry_events`, `telemetry_logs` |
| grant | authenticated | select | `test_suites_runs`, `sicoob_approval_delegations`, `sicoob_invitations`, `sicoob_invitation_events`, `pa_budgets`, `cooperativa_budgets`, `catalog_marketing_terms`, `catalog_marketing_term_usage`, `sicoob_rls_audit_logs`, `access_blocked_log` |
| grant | authenticated | select, insert | `quote_save_idempotency`, `search_analytics`, `search_analytics` |
| grant | authenticated | select, insert, update, delete | `notification_preferences`, `quote_save_idempotency`, `catalog_marketing_terms`, `catalog_product_marketing` |
| grant | authenticated, anon | execute | `search_products_semantic`, `can_view_audit_logs`, `can_view_telemetry`, `can_view_connections`, `can_manage_connections` |
| grant | authenticated, service_role | execute | `get_web_vitals_regression`, `audit_ownership_orphans`, `audit_rls_coverage`, `audit_rls_matrix`, `audit_security_definer_acl`, `assert_database_auditor`, `audit_rls_matrix`, `audit_rls_coverage`, `check_tables_rls`, `audit_actor_email`, `copy_group_personalization_to_product`, `create_quote_version_atomic`, `consume_step_up_token`, `log_full_scope_grant`, `log_rls_denial` … +33 |
| grant | authenticated, service_role | select | `v_full_scope_grants`, `catalog_marketing_term_usage` |
| grant | authenticated, service_role | select, insert, update, delete | `personalization_simulations` |
| grant | postgres, service_role | execute | `retry_failed_webhook_deliveries`, `cleanup_webhook_logs`, `auto_revoke_orphan_full_keys`, `cleanup_webhook_logs`, `retry_failed_webhook_deliveries` |
| grant | service_role | all | `telemetry_events`, `telemetry_logs`, `test_suites_runs`, `notification_preferences`, `search_analytics`, `search_analytics` |
| grant | service_role | execute | `cleanup_old_notifications`, `record_public_token_failure`, `check_sicoob_access_matrix`, `cleanup_test_auth_orphans`, `qa_preflight_check`, `public`, `check_tables_rls`, `refresh_mv_benchmark_setorial`, `reorder_sicoob_order_as_quote`, `create_sicoob_order_artwork_version`, `create_sicoob_kit_quote`, `get_sicoob_reorder_idempotency`, `reorder_sicoob_order_as_quote`, `get_sicoob_kit_quote_idempotency`, `create_sicoob_kit_quote` … +61 |
| grant | service_role | insert | `access_blocked_log` |
| grant | service_role | select | `quote_approval_evidence_keys`, `sicoob_approval_delivery_archive` |
| grant | service_role | select, insert, update, delete | `sicoob_approval_deliveries` |
| grant | service_role | select,insert,update,delete | `sicoob_approval_worker_dispatches` |
| grant | service_role, authenticated | execute | `record_mcp_access_violation` |
| grant | supabase_auth_admin, service_role | execute | `create_default_notification_preferences` |
| revoke | PUBLIC | all | `cleanup_old_notifications`, `get_web_vitals_summary`, `get_web_vitals_regression`, `retry_failed_webhook_deliveries`, `cleanup_webhook_logs`, `set_connections_auto_test_interval`, `set_connection_failure_window_minutes`, `get_auto_test_job_status`, `check_telemetry_regression`, `log_full_scope_grant`, `log_access_denied`, `record_dev_route_telemetry`, `auto_revoke_orphan_full_keys`, `log_rls_denial`, `audit_ownership_orphans` … +83 |
| revoke | PUBLIC | execute | `check_sicoob_access_matrix`, `public`, `can_manage`, `can_view_all_sales`, `get_user_org_ids`, `has_role`, `is_admin`, `is_dev`, `is_kit_collaborator`, `is_kit_owner`, `is_supervisor_or_above`, `can_manage`, `can_view_all_sales`, `current_user_cooperativa_id`, `current_user_pa_id` … +11 |
| revoke | PUBLIC, anon | all | `check_hardening_status`, `record_mcp_access_violation`, `assert_database_auditor`, `v_full_scope_grants`, `copy_group_personalization_to_product`, `create_quote_version_atomic`, `personalization_simulations`, `convert_quote_to_sicoob_order`, `mutate_sicoob_order_item`, `consolidate_sicoob_quotes`, `upsert_sicoob_order_shipment`, `ensure_default_favorite_list`, `retry_own_sicoob_export_job`, `bulk_update_quote_status_atomic`, `request_discount_approval_atomic` … +60 |
| revoke | PUBLIC, anon | execute | `is_order_owner_or_admin`, `consume_step_up_token`, `log_full_scope_grant`, `log_rls_denial`, `audit_security_definer_acl`, `audit_security_definer_acl`, `can_manage`, `get_user_pa_id`, `get_user_cooperative_id`, `get_user_singular_id`, `is_kit_owner`, `is_kit_collaborator`, `can_view_all_sales`, `current_user_cooperativa_id`, `current_user_pa_id` … +8 |
| revoke | PUBLIC, anon, authenticated | all | `cleanup_security_logs`, `check_mcp_abuse_threshold`, `is_gestor_compras`, `is_gerente_pa`, `is_vendedor_role`, `current_user_pa_id`, `current_user_cooperativa_id`, `refresh_mv_benchmark_setorial`, `audit_rls_matrix`, `audit_rls_coverage`, `check_tables_rls`, `check_sicoob_access_matrix`, `audit_actor_email`, `get_enum_values`, `check_rls_enabled` … +87 |
| revoke | PUBLIC, anon, authenticated | execute | `validate_order_status`, `log_order_status_change`, `record_public_token_failure`, `search_products_semantic`, `check_rate_limit`, `increment_webhook_endpoint_metrics` |
| revoke | PUBLIC, anon, authenticated, service_role | all | `guard_profile_authority_fields`, `convert_quote_to_sicoob_order_core_20261013`, `create_quote_version_atomic_core_20261013`, `apply_local_quote_approval_response_core_20261013`, `bulk_update_quote_status_atomic_core_20261013`, `approve_quote_with_pdf_atomic_core_20261013`, `request_discount_approval_atomic_core_20261013`, `respond_discount_approval_atomic_core_20261013`, `handle_row_version`, `guard_quote_governance_write`, `assert_quote_content_editable`, `guard_quote_item_content_write`, `guard_quote_personalization_content_write`, `assert_quote_transition`, `webhook_retry_claims` … +6 |
| revoke | PUBLIC,anon,authenticated | all | `enqueue_sicoob_approval_event`, `claim_sicoob_approval_delivery`, `validate_sicoob_order_document`, `preserve_sicoob_artwork_requirement`, `sicoob_approval_worker_dispatches`, `dispatch_sicoob_approval_worker`, `monitor_sicoob_approval_worker`, `register_sicoob_clean_document`, `validate_sicoob_order_document`, `register_sicoob_clean_document` |
| revoke | anon | all | `get_webhook_delivery_summary`, `get_app_health_summary`, `lookup_request_id`, `sales_goals`, `notification_preferences`, `pa_budgets`, `cooperativa_budgets`, `catalog_marketing_terms`, `catalog_product_marketing`, `catalog_marketing_term_usage`, `sicoob_rls_audit_logs`, `search_analytics`, `search_analytics`, `normalize_search_analytics_insert`, `normalize_search_analytics_insert` … +2 |
| revoke | anon | execute | `check_sicoob_access_matrix`, `public`, `sync_external_connections_from_credentials`, `sync_external_connections_from_credentials`, `seed_qa_scenario`, `send_notification`, `ensure_default_favorite_list`, `acquire_ai_quota`, `create_organization_with_owner`, `generate_sicoob_performance_report` |
| revoke | anon, authenticated | all | `sicoob_approval_delegations` |
| revoke | anon, authenticated | execute | `cleanup_old_notifications`, `inspect_query_plan`, `cleanup_test_auth_orphans`, `archive_old_admin_audit_logs`, `audit_all_rls_compliance`, `audit_sicoob_rls_policies`, `auto_block_extreme_offenders`, `auto_revoke_orphan_full_keys`, `cleanup_discount_test_data`, `cleanup_expired_collection_trash`, `cleanup_expired_favorite_trash`, `cleanup_expired_public_comparisons`, `cleanup_expired_step_up`, `cleanup_old_notifications`, `cleanup_rate_limits` … +16 |
| revoke | anon, authenticated | insert | `favorite_item_reactions` |
| revoke | anon, authenticated | insert, update, delete | `discount_approval_requests`, `quote_history` |
| revoke | anon, authenticated | truncate | `password_reset_requests`, `audit_log` |
| revoke | anon, authenticated | update, delete, truncate | `sicoob_order_history` |
| revoke | authenticated | all | `search_analytics`, `normalize_search_analytics_insert`, `normalize_search_analytics_insert`, `process_export_queue_v3` |
| revoke | authenticated | execute | `check_sicoob_access_matrix` |
| revoke | authenticated | insert, update, delete | `pa_budgets`, `cooperativa_budgets` |
| revoke | authenticated, anon | all | `e2e_cleanup_check_rate_limit` |
| revoke | authenticated, anon | insert, update, delete | `sicoob_quote_reorder_requests` |
| revoke | public | all | `seed_discount_test_users`, `cleanup_discount_test_data`, `search_products_semantic`, `audit_rls_coverage`, `audit_rls_matrix` |
| revoke | public | execute | `cleanup_test_auth_orphans` |
| revoke | public, anon | all | `execute_role_migration_batch` |
| revoke | public, anon, authenticated | all | `record_public_token_failure` |

## Riscos de acesso detectados

| Tabela | Problema | Arquivos |
|---|---|---|
| `admin_audit_log` | front faz INSERT mas nenhuma política RLS permite INSERT → vai falhar/retornar vazio para usuários | `src/hooks/useDiscountApproval.ts`<br>`src/lib/audit-logger.ts` |
| `catalog_marketing_term_usage` | acessada do front (1 arquivo(s)) sem RLS (não encontrado) | `src/hooks/useCatalogMarketing.ts` |
| `discount_approval_requests` | front faz UPDATE mas nenhuma política RLS permite UPDATE → vai falhar/retornar vazio para usuários | `src/components/admin/DiscountApprovalQueue.tsx` |
| `scheduled_notifications` | front faz UPDATE mas nenhuma política RLS permite UPDATE → vai falhar/retornar vazio para usuários | `src/hooks/useNotificationOmnichannel.ts` |
| `sicoob_centrais` | front faz INSERT mas nenhuma política RLS permite INSERT → vai falhar/retornar vazio para usuários | `src/pages/admin/AdminCentraisPage.tsx` |
| `sicoob_centrais` | front faz UPDATE mas nenhuma política RLS permite UPDATE → vai falhar/retornar vazio para usuários | `src/pages/admin/AdminCentraisPage.tsx` |
| `sicoob_centrais` | front faz DELETE mas nenhuma política RLS permite DELETE → vai falhar/retornar vazio para usuários | `src/pages/admin/AdminCentraisPage.tsx` |
| `v_sicoob_hierarchy` | acessada do front (1 arquivo(s)) sem RLS (não encontrado) | `src/components/sicoob/HierarchyPath.tsx` |

## Multi-tenancy

- Chave de tenant: **`organization_id`** presente em 4 tabela(s): `quotes`, `orders`, `order_items`, `organization_members`
- Cobertura: 1% das tabelas. Abaixo de 60% — isolamento provavelmente por usuário (auth.uid()) ou misto; não flagado por tabela.

## Soft delete (registros 'apagados' continuam na tabela — filtre!)

| Tabela | Coluna |
|---|---|
| `webhook_configs` | `is_active` |
| `push_subscriptions` | `is_active` |
| `categories` | `active` |
| `categories` | `deleted_at` |
| `suppliers` | `active` |
| `suppliers` | `deleted_at` |
| `products` | `is_active` |
| `products` | `deleted_at` |
| `quotes` | `deleted_at` |
| `quotes` | `is_active` |
| `profiles` | `is_active` |
| `profiles` | `deleted_at` |
| `personalization_techniques` | `is_active` |
| `personalization_locations` | `is_active` |
| `personalization_sizes` | `is_active` |
| `product_components` | `is_active` |
| `product_components` | `deleted_at` |
| `product_component_locations` | `is_active` |
| `product_component_locations` | `deleted_at` |
| `product_component_location_techniques` | `is_active` |
| `product_groups` | `is_active` |
| `product_groups` | `deleted_at` |
| `product_group_components` | `is_active` |
| `product_group_locations` | `is_active` |
| `product_group_location_techniques` | `is_active` |
| `achievements` | `is_active` |
| `store_rewards` | `is_active` |
| `user_rewards` | `is_active` |
| `scheduled_reports` | `is_active` |
| `user_allowed_ips` | `is_active` |
| `geo_allowed_countries` | `is_active` |
| `clients` | `deleted_at` |
| `companies` | `is_active` |
| `company_contacts` | `is_active` |
| `category_icons` | `is_active` |
| `color_groups` | `is_active` |
| `color_variations` | `is_active` |
| `color_nuances` | `is_active` |
| `product_novelties` | `is_active` |
| `ip_whitelist` | `is_active` |
| `city_whitelist` | `is_active` |
| `mockup_prompt_configs` | `is_active` |
| `organizations` | `is_active` |
| `kit_templates` | `is_active` |
| `outbound_webhooks` | `active` |
| `inbound_webhook_endpoints` | `active` |
| `favorite_items_trash` | `deleted_at` |
| `collection_items_trash` | `deleted_at` |
| `cooperativas` | `is_active` |
| `postos_atendimento` | `is_active` |
| `scheduled_exports` | `is_active` |
| `product_categories` | `is_active` |
| `product_categories` | `deleted_at` |
| `singulares` | `is_active` |
| `cooperativas_parceiras` | `is_active` |
| `newsletter_subscribers` | `is_active` |
| `coupons` | `is_active` |
| `cms_banners` | `is_active` |
| `cms_sections` | `is_active` |
| `pa_singularidades` | `is_active` |
| `pontos_atendimento` | `is_active` |
| `portfolio_items` | `is_active` |
| `notification_channels` | `is_active` |
| `pa_notification_settings` | `is_active` |
| `sicoob_approval_policies` | `is_active` |
| `quote_approval_evidence_keys` | `is_active` |
| `sicoob_approval_delivery_archive` | `archived_at` |
| `catalog_marketing_terms` | `is_active` |

## Auditoria (colunas de rastreio)

| Tabela | Colunas |
|---|---|
| `notification_templates` | `created_at` |
| `webhook_configs` | `created_at` |
| `webhook_logs` | `created_at` |
| `push_subscriptions` | `created_at` |
| `saved_filters` | `created_at`, `updated_at` |
| `categories` | `created_at` |
| `suppliers` | `created_at` |
| `products` | `created_at`, `updated_at` |
| `quotes` | `created_at`, `updated_at` |
| `profiles` | `created_at`, `updated_at` |
| `bitrix_clients` | `created_at`, `updated_at` |
| `bitrix_deals` | `created_at` |
| `personalization_techniques` | `created_at`, `updated_at` |
| `quote_items` | `created_at`, `updated_at` |
| `quote_item_personalizations` | `created_at`, `updated_at` |
| `product_sync_logs` | `created_at` |
| `personalization_locations` | `created_at` |
| `personalization_sizes` | `created_at` |
| `product_components` | `created_at`, `updated_at` |
| `product_component_locations` | `created_at`, `updated_at` |
| `product_component_location_techniques` | `created_at` |
| `product_groups` | `created_at`, `updated_at` |
| `product_group_members` | `created_at`, `updated_at` |
| `product_group_components` | `created_at` |
| `product_group_locations` | `created_at` |
| `product_group_location_techniques` | `created_at` |
| `personalization_simulations` | `created_at`, `updated_at` |
| `expert_conversations` | `created_at`, `updated_at` |
| `expert_messages` | `created_at` |
| `generated_mockups` | `created_at` |
| `seller_gamification` | `created_at`, `updated_at` |
| `achievements` | `created_at` |
| `product_views` | `created_at` |
| `search_analytics` | `created_at` |
| `quote_templates` | `created_at`, `created_by`, `updated_at` |
| `quote_history` | `created_at` |
| `quote_approval_tokens` | `created_at`, `updated_at` |
| `orders` | `created_at`, `updated_at` |
| `order_items` | `created_at` |
| `order_history` | `created_at` |
| `sales_goals` | `created_at`, `updated_at` |
| `follow_up_reminders` | `created_at` |
| `audit_log` | `created_at` |
| `sync_jobs` | `created_at`, `created_by` |
| `quote_comments` | `created_at`, `updated_at` |
| `user_filter_presets` | `created_at` |
| `store_rewards` | `created_at` |
| `user_onboarding` | `created_at`, `updated_at` |
| `scheduled_reports` | `created_at`, `updated_at` |
| `analytics_events` | `created_at`, `updated_at` |
| `audit_trail` | `created_at`, `updated_at` |
| `cache_entries` | `created_at`, `updated_at` |
| `feature_flags` | `created_at`, `updated_at` |
| `optimization_logs` | `created_at`, `updated_at` |
| `rate_limits` | `created_at`, `updated_at` |
| `redis_config` | `created_at`, `updated_at` |
| `template_versions` | `created_at`, `updated_at` |
| `two_factor_secrets` | `created_at`, `updated_at` |
| `websocket_sessions` | `created_at`, `updated_at` |
| `roles` | `created_at` |
| `user_2fa_settings` | `created_at`, `updated_at` |
| `user_allowed_ips` | `created_at`, `created_by` |
| `login_attempts` | `created_at` |
| `user_known_devices` | `created_at` |
| `device_login_notifications` | `created_at` |
| `user_passkeys` | `created_at` |
| `geo_allowed_countries` | `created_at`, `created_by` |
| `security_settings` | `updated_at`, `updated_by` |
| `collections` | `created_at`, `updated_at` |
| `mockup_drafts` | `created_at`, `updated_at` |
| `companies` | `created_at`, `created_by`, `updated_at`, `updated_by` |
| `company_contacts` | `created_at`, `updated_at` |
| `contact_phones` | `created_at` |
| `contact_emails` | `created_at` |
| `company_addresses` | `created_at`, `updated_at` |
| `category_icons` | `created_at`, `updated_at` |
| `color_groups` | `created_at`, `updated_at` |
| `color_variations` | `created_at`, `updated_at` |
| `color_nuances` | `created_at`, `updated_at` |
| `product_novelties` | `created_at`, `updated_at` |
| `future_stock_entries` | `created_at`, `created_by`, `updated_at`, `updated_by` |
| `art_file_attachments` | `created_at`, `updated_at` |
| `simulator_wizard_drafts` | `created_at`, `updated_at` |
| `seller_carts` | `created_at`, `updated_at` |
| `seller_cart_items` | `created_at`, `updated_at` |
| `magic_up_generations` | `created_at` |
| `mockup_templates` | `created_at`, `updated_at` |
| `ip_whitelist` | `created_at`, `created_by`, `updated_at` |
| `city_whitelist` | `created_at`, `created_by`, `updated_at` |
| `access_blocked_log` | `created_at` |
| `access_security_settings` | `updated_at`, `updated_by` |
| `mockup_prompt_configs` | `created_at`, `updated_at` |
| `cart_templates` | `created_at`, `updated_at` |
| `query_telemetry` | `created_at` |
| `video_variant_links` | `created_at` |
| `organizations` | `created_at`, `updated_at` |
| `organization_members` | `created_at`, `updated_at` |
| `custom_kits` | `created_at`, `updated_at` |
| `kit_share_tokens` | `created_at`, `updated_at` |
| `permissions` | `created_at`, `updated_at` |
| `role_permissions` | `created_at` |
| `component_media` | `created_at`, `updated_at` |
| `workspace_notifications` | `created_at` |
| `voice_command_logs` | `created_at` |
| `ai_usage_logs` | `created_at` |
| `ai_usage_quotas` | `created_at`, `updated_at` |
| `collection_items` | `created_at` |
| `seller_discount_limits` | `created_at`, `updated_at` |
| `discount_approval_requests` | `created_at`, `updated_at` |
| `request_rate_limits` | `created_at`, `updated_at` |
| `bot_detection_log` | `created_at` |
| `ip_access_control` | `created_at`, `created_by`, `updated_at` |
| `saved_trends_views` | `created_at`, `updated_at` |
| `ai_insights_cache` | `created_at` |
| `ai_usage_events` | `created_at` |
| `kit_variants` | `created_at`, `updated_at` |
| `kit_collaborators` | `created_at`, `updated_at` |
| `kit_comments` | `created_at`, `updated_at` |
| `kit_templates` | `created_at`, `created_by`, `updated_at` |
| `public_token_failures` | `created_at` |
| `hardening_health_snapshots` | `created_at` |
| `external_connections` | `created_at`, `created_by`, `updated_at` |
| `outbound_webhooks` | `created_at`, `created_by`, `updated_at` |
| `inbound_webhook_endpoints` | `created_at`, `created_by`, `updated_at` |
| `mcp_api_keys` | `created_at`, `created_by`, `updated_at` |
| `connection_test_history` | `created_at` |
| `favorite_lists` | `created_at`, `updated_at` |
| `favorite_items` | `updated_at` |
| `favorite_item_reactions` | `created_at` |
| `collection_item_reactions` | `created_at` |
| `user_comparisons` | `created_at`, `updated_at` |
| `comparison_reactions` | `created_at` |
| `user_preferences` | `created_at`, `updated_at` |
| `magic_up_campaigns` | `created_at`, `updated_at` |
| `magic_up_brand_kits` | `created_at`, `updated_at` |
| `magic_up_comments` | `created_at` |
| `magic_up_reactions` | `created_at` |
| `magic_up_public_shares` | `created_at`, `updated_at` |
| `integration_credentials` | `created_at`, `updated_at`, `updated_by` |
| `system_settings` | `created_at`, `updated_at`, `updated_by` |
| `admin_settings` | `created_at`, `updated_at`, `updated_by` |
| `product_price_freshness_overrides` | `created_at`, `updated_at`, `updated_by` |
| `optimization_queue` | `created_at`, `created_by`, `updated_at` |
| `optimization_queue_runs` | `created_at` |
| `external_connections_sync_log` | `created_at` |
| `step_up_challenges` | `created_at` |
| `step_up_tokens` | `created_at` |
| `step_up_audit_log` | `created_at` |
| `mcp_access_violations` | `created_at` |
| `mcp_key_auto_revocations` | `created_at`, `created_by` |
| `role_migration_batches` | `created_at` |
| `role_migration_items` | `created_at` |
| `rls_denial_log` | `created_at` |
| `ownership_repair_logs` | `created_at` |
| `e2e_cleanup_audit` | `created_at` |
| `e2e_cleanup_rate_limit` | `updated_at` |
| `file_scan_logs` | `created_at` |
| `cooperativas` | `created_at`, `updated_at` |
| `postos_atendimento` | `created_at`, `updated_at` |
| `cooperativa_budgets` | `created_at`, `updated_at` |
| `pa_budgets` | `created_at`, `updated_at` |
| `sicoob_orders` | `created_at`, `created_by`, `updated_at` |
| `sicoob_order_items` | `created_at` |
| `sicoob_order_history` | `created_at` |
| `sicoob_approval_requests` | `created_at`, `updated_at` |
| `sicoob_rls_audit_logs` | `created_at` |
| `sicoob_order_item_logs` | `created_at` |
| `order_logistics_tracking` | `created_at`, `created_by`, `updated_at` |
| `order_invoices` | `created_at`, `created_by`, `updated_at` |
| `order_payments` | `created_at`, `created_by`, `updated_at` |
| `order_pilot_approvals` | `created_at`, `created_by`, `updated_at` |
| `order_comments` | `created_at`, `updated_at` |
| `order_templates` | `created_at`, `updated_at` |
| `order_template_items` | `created_at` |
| `order_audit_events` | `created_at` |
| `order_logistics` | `created_at`, `updated_at` |
| `logistics_tracking` | `created_at`, `created_by` |
| `order_consolidations` | `created_at`, `updated_at` |
| `quote_consolidations` | `created_at`, `updated_at` |
| `notifications` | `created_at`, `updated_at` |
| `export_jobs` | `created_at`, `updated_at` |
| `export_audit_log` | `created_at` |
| `scheduled_exports` | `created_at`, `updated_at` |
| `product_categories` | `created_at`, `updated_at` |
| `singulares` | `created_at`, `updated_at` |
| `cooperativas_parceiras` | `created_at`, `updated_at` |
| `newsletter_subscribers` | `created_at`, `updated_at` |
| `coupons` | `created_at`, `updated_at` |
| `campaigns` | `created_at`, `updated_at` |
| `cms_banners` | `created_at`, `updated_at` |
| `cms_sections` | `created_at`, `updated_at` |
| `telemetry_logs` | `created_at` |
| `pa_singularidades` | `created_at`, `updated_at` |
| `pontos_atendimento` | `created_at`, `updated_at` |
| `limit_increase_requests` | `created_at`, `updated_at` |
| `qa_runs` | `created_by` |
| `qa_releases` | `created_at`, `updated_at` |
| `qa_release_evidences` | `created_at` |
| `qa_run_steps` | `created_at` |
| `sicoob_manager_audit` | `created_at` |
| `cart_items` | `created_at`, `updated_at` |
| `cms_config` | `created_at`, `updated_at` |
| `blog_posts` | `created_at`, `updated_at` |
| `portfolio_items` | `created_at`, `updated_at` |
| `notification_channels` | `created_at` |
| `notification_digests` | `created_at` |
| `scheduled_notifications` | `created_at` |
| `notification_logs` | `created_at` |
| `order_approval_history` | `created_at` |
| `pa_category_thresholds` | `created_at` |
| `manager_notification_config` | `created_at` |
| `pa_notification_settings` | `created_at` |
| `quote_audit_logs` | `created_at` |
| `admin_audit_log` | `created_at` |
| `sicoob_centrais` | `created_at`, `updated_at` |
| `sicoob_temas` | `created_at` |
| `telemetry_events` | `created_at` |
| `sicoob_order_shipments` | `created_at`, `created_by`, `updated_at` |
| `sicoob_approval_policies` | `created_at`, `updated_at` |
| `sicoob_reorder_requests` | `created_at` |
| `sicoob_order_invoices` | `created_at`, `created_by` |
| `sicoob_order_payments` | `created_at`, `created_by`, `updated_at`, `updated_by` |
| `sicoob_order_artwork_versions` | `created_at`, `created_by` |
| `order_consolidation_orders` | `created_at` |
| `sicoob_delivery_destinations` | `created_at` |
| `sicoob_delivery_allocations` | `updated_at` |
| `sicoob_kit_quote_requests` | `created_at` |
| `sicoob_approval_deliveries` | `created_at`, `updated_at` |
| `sicoob_document_registry` | `created_at` |
| `order_duplicate_requests` | `created_at` |
| `sicoob_approval_delegations` | `created_at` |
| `sicoob_quote_reorder_requests` | `created_at` |
| `sicoob_invitations` | `created_at`, `updated_at` |
| `sicoob_invitation_events` | `created_at` |
| `quote_save_idempotency` | `created_at` |
| `catalog_marketing_terms` | `created_at`, `created_by`, `updated_at`, `updated_by` |
| `catalog_product_marketing` | `created_at`, `created_by` |
| `private.quote_price_attestations` | `created_at` |
| `_backup_custom_kits_pinned_20261118` | `updated_at` |
| `admin_audit_log_default` | `created_at` |
| `admin_audit_log_y2024` | `created_at` |
| `admin_audit_log_y2025` | `created_at` |
| `admin_audit_log_y2026_m01` | `created_at` |
| `admin_audit_log_y2026_m02` | `created_at` |
| `admin_audit_log_y2026_m03` | `created_at` |
| `admin_audit_log_y2026_m04` | `created_at` |
| `admin_audit_log_y2026_m05` | `created_at` |
| `admin_audit_log_y2026_m06` | `created_at` |
| `admin_audit_log_y2026_m07` | `created_at` |
| `admin_audit_log_y2026_m08` | `created_at` |
| `admin_audit_log_y2026_m09` | `created_at` |
| `admin_audit_log_y2026_m10` | `created_at` |
| `admin_audit_log_y2026_m11` | `created_at` |
| `admin_audit_log_y2026_m12` | `created_at` |
| `admin_audit_log_y2027_m01` | `created_at` |
| `admin_audit_log_y2027_m02` | `created_at` |
| `admin_audit_log_y2027_m03` | `created_at` |
| `telemetry_query_performance` | `created_at` |

## Dados pessoais / sensíveis (LGPD — cuidado em logs, exports, prompts de IA)

| Tabela | Coluna |
|---|---|
| `suppliers` | `cnpj` |
| `suppliers` | `email` |
| `suppliers` | `phone` |
| `profiles` | `email` |
| `profiles` | `phone` |
| `bitrix_clients` | `email` |
| `bitrix_clients` | `phone` |
| `bitrix_clients` | `address` |
| `audit_log` | `ip_address` |
| `password_reset_requests` | `email` |
| `user_allowed_ips` | `ip_address` |
| `login_attempts` | `email` |
| `login_attempts` | `ip_address` |
| `user_known_devices` | `ip_address` |
| `device_login_notifications` | `ip_address` |
| `companies` | `cnpj` |
| `companies` | `cep` |
| `companies` | `logradouro` |
| `contact_emails` | `email` |
| `company_addresses` | `cep` |
| `company_addresses` | `logradouro` |
| `ip_whitelist` | `ip_address` |
| `access_blocked_log` | `email` |
| `access_blocked_log` | `ip_address` |
| `bot_detection_log` | `ip_address` |
| `ip_access_control` | `ip_address` |
| `public_token_failures` | `ip_address` |
| `step_up_challenges` | `ip_address` |
| `step_up_audit_log` | `ip_address` |
| `mcp_access_violations` | `ip_address` |
| `rls_denial_log` | `ip_address` |
| `e2e_cleanup_audit` | `email` |
| `cooperativas` | `cnpj` |
| `cooperativas` | `email` |
| `cooperativas` | `phone` |
| `cooperativas` | `address` |
| `postos_atendimento` | `endereco` |
| `singulares` | `address` |
| `singulares` | `phone` |
| `singulares` | `email` |
| `cooperativas_parceiras` | `phone` |
| `newsletter_subscribers` | `email` |
| `pontos_atendimento` | `address` |
| `sicoob_manager_audit` | `ip_address` |
| `quote_audit_logs` | `ip_address` |
| `admin_audit_log` | `ip_address` |
| `sicoob_invitations` | `email` |
| `admin_audit_log_default` | `ip_address` |
| `admin_audit_log_y2024` | `ip_address` |
| `admin_audit_log_y2025` | `ip_address` |
| `admin_audit_log_y2026_m01` | `ip_address` |
| `admin_audit_log_y2026_m02` | `ip_address` |
| `admin_audit_log_y2026_m03` | `ip_address` |
| `admin_audit_log_y2026_m04` | `ip_address` |
| `admin_audit_log_y2026_m05` | `ip_address` |
| `admin_audit_log_y2026_m06` | `ip_address` |
| `admin_audit_log_y2026_m07` | `ip_address` |
| `admin_audit_log_y2026_m08` | `ip_address` |
| `admin_audit_log_y2026_m09` | `ip_address` |
| `admin_audit_log_y2026_m10` | `ip_address` |
| `admin_audit_log_y2026_m11` | `ip_address` |
| `admin_audit_log_y2026_m12` | `ip_address` |
| `admin_audit_log_y2027_m01` | `ip_address` |
| `admin_audit_log_y2027_m02` | `ip_address` |
| `admin_audit_log_y2027_m03` | `ip_address` |
| `v_full_scope_grants` | `ip_address` |

## Colunas de dinheiro (tipo importa: numeric ✅ / float ❌)

| Tabela | Coluna | Tipo |
|---|---|---|
| `webhook_configs` | `total_calls` | `INT` |
| `products` | `price` | `NUMERIC(12,2)` |
| `quotes` | `subtotal` | `numeric` |
| `quotes` | `discount_percent` | `numeric` |
| `quotes` | `discount_amount` | `numeric` |
| `quotes` | `total` | `numeric` |
| `quotes` | `shipping_type` | `text` |
| `quotes` | `shipping_cost` | `numeric` |
| `quotes` | `total_cost` | `NUMERIC` |
| `bitrix_clients` | `total_spent` | `numeric(12,2)` |
| `quote_items` | `subtotal` | `numeric` |
| `quote_items` | `price_confirmed_at` | `timestamptz` |
| `quote_items` | `price_changed` | `boolean` |
| `quote_item_personalizations` | `total_cost` | `numeric` |
| `personalization_sizes` | `price_modifier` | `NUMERIC(5,2)` |
| `seller_gamification` | `total_activities` | `INTEGER` |
| `quote_templates` | `discount_percent` | `numeric` |
| `quote_templates` | `discount_amount` | `numeric` |
| `orders` | `subtotal` | `numeric` |
| `orders` | `discount_amount` | `numeric` |
| `orders` | `shipping_cost` | `numeric` |
| `orders` | `total` | `numeric` |
| `orders` | `shipping_type` | `text` |
| `orders` | `shipping_carrier` | `TEXT` |
| `orders` | `shipping_delivery_forecast` | `TIMESTAMP` |
| `sync_jobs` | `total` | `INTEGER` |
| `companies` | `total_pedidos` | `INTEGER` |
| `companies` | `total_gasto` | `NUMERIC` |
| `custom_kits` | `total_price` | `numeric` |
| `ai_usage_logs` | `total_tokens` | `integer` |
| `collection_items` | `price_at_save` | `NUMERIC` |
| `kit_variants` | `total_price` | `NUMERIC` |
| `kit_templates` | `total_price` | `numeric` |
| `outbound_webhooks` | `total_success` | `int` |
| `outbound_webhooks` | `total_failure` | `int` |
| `inbound_webhook_endpoints` | `total_received` | `int` |
| `inbound_webhook_endpoints` | `total_invalid` | `int` |
| `favorite_items` | `price_at_save` | `NUMERIC(12,2)` |
| `favorite_items_trash` | `price_at_save` | `NUMERIC(12,2)` |
| `collection_items_trash` | `price_at_save` | `NUMERIC` |
| `price_history` | `price` | `numeric(12,2)` |
| `role_migration_batches` | `total_items` | `integer` |
| `ownership_audit_reports` | `total_tables_scanned` | `integer` |
| `ownership_audit_reports` | `total_issues_found` | `integer` |
| `e2e_cleanup_audit` | `total_deleted` | `INT` |
| `sicoob_orders` | `total_amount` | `DECIMAL(12,2)` |
| `sicoob_orders` | `discount_amount` | `numeric(14,2)` |
| `sicoob_orders` | `shipping_amount` | `numeric(14,2)` |
| `sicoob_order_items` | `total_price` | `DECIMAL(12,2)` |
| `sicoob_approval_requests` | `amount_at_request` | `NUMERIC(15,2)` |
| `sicoob_performance_reports` | `total_time_ms` | `NUMERIC` |
| `order_invoices` | `amount` | `DECIMAL(12,2)` |
| `order_payments` | `amount` | `DECIMAL(12,2)` |
| `order_pilot_approvals` | `feedback` | `TEXT` |
| `order_consolidations` | `total_value` | `numeric(12,2)` |
| `export_jobs` | `total_count` | `INTEGER` |
| `coupons` | `discount_type` | `TEXT` |
| `coupons` | `discount_value` | `NUMERIC` |
| `order_approval_history` | `subtotal_at_time` | `DECIMAL(12,2)` |
| `sicoob_order_invoices` | `amount` | `numeric(14,2)` |
| `sicoob_order_payments` | `amount` | `numeric(14,2)` |
| `sicoob_order_artwork_versions` | `feedback` | `text` |
