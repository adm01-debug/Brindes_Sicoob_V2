# Tabelas

Um arquivo por tabela em `tables/<schema>/<tabela>.md` (colunas, constraints, índices, RLS/policies, triggers, grants). Métricas de volume em `stats.md`.

| tabela | tipo | RLS | policies | colunas | realtime | comentário |
|---|---|---|---|---|---|---|
| [public._backup_custom_kits_pinned_20261118](tables/public/backup_custom_kits_pinned_20261118.md) | table | sim | 0 | 6 | não | Estado de is_pinned/last_used_at/updated_at dos kits fixados imediatamente antes de 20261118130400_pin_custom_kit_atomically. RLS habilitada sem policy: somente superusuario e o owner da tabela leem. |
| [public.access_blocked_log](tables/public/access_blocked_log.md) | table | sim | 2 | 10 | não |  |
| [public.access_security_settings](tables/public/access_security_settings.md) | table | sim | 1 | 8 | não |  |
| [public.admin_audit_log](tables/public/admin_audit_log.md) | partitioned | sim | 2 | 18 | não |  |
| [public.admin_audit_log_default](tables/public/admin_audit_log_default.md) | table (partição) | sim | 2 | 18 | não |  |
| [public.admin_audit_log_y2024](tables/public/admin_audit_log_y2024.md) | table (partição) | sim | 2 | 18 | não |  |
| [public.admin_audit_log_y2025](tables/public/admin_audit_log_y2025.md) | table (partição) | sim | 2 | 18 | não |  |
| [public.admin_audit_log_y2026_m01](tables/public/admin_audit_log_y2026_m01.md) | table (partição) | sim | 2 | 18 | não |  |
| [public.admin_audit_log_y2026_m02](tables/public/admin_audit_log_y2026_m02.md) | table (partição) | sim | 2 | 18 | não |  |
| [public.admin_audit_log_y2026_m03](tables/public/admin_audit_log_y2026_m03.md) | table (partição) | sim | 2 | 18 | não |  |
| [public.admin_audit_log_y2026_m04](tables/public/admin_audit_log_y2026_m04.md) | table (partição) | sim | 2 | 18 | não |  |
| [public.admin_audit_log_y2026_m05](tables/public/admin_audit_log_y2026_m05.md) | table (partição) | sim | 2 | 18 | não |  |
| [public.admin_audit_log_y2026_m06](tables/public/admin_audit_log_y2026_m06.md) | table (partição) | sim | 2 | 18 | não |  |
| [public.admin_audit_log_y2026_m07](tables/public/admin_audit_log_y2026_m07.md) | table (partição) | sim | 2 | 18 | não |  |
| [public.admin_audit_log_y2026_m08](tables/public/admin_audit_log_y2026_m08.md) | table (partição) | sim | 2 | 18 | não |  |
| [public.admin_audit_log_y2026_m09](tables/public/admin_audit_log_y2026_m09.md) | table (partição) | sim | 2 | 18 | não |  |
| [public.admin_audit_log_y2026_m10](tables/public/admin_audit_log_y2026_m10.md) | table (partição) | sim | 2 | 18 | não |  |
| [public.admin_audit_log_y2026_m11](tables/public/admin_audit_log_y2026_m11.md) | table (partição) | sim | 2 | 18 | não |  |
| [public.admin_audit_log_y2026_m12](tables/public/admin_audit_log_y2026_m12.md) | table (partição) | sim | 2 | 18 | não |  |
| [public.admin_audit_log_y2027_m01](tables/public/admin_audit_log_y2027_m01.md) | table (partição) | sim | 2 | 18 | não |  |
| [public.admin_audit_log_y2027_m02](tables/public/admin_audit_log_y2027_m02.md) | table (partição) | sim | 2 | 18 | não |  |
| [public.admin_audit_log_y2027_m03](tables/public/admin_audit_log_y2027_m03.md) | table (partição) | sim | 2 | 18 | não |  |
| [public.admin_config_audit](tables/public/admin_config_audit.md) | table | sim | 1 | 7 | não |  |
| [public.admin_settings](tables/public/admin_settings.md) | table | sim | 3 | 6 | não |  |
| [public.ai_insights_cache](tables/public/ai_insights_cache.md) | table | sim | 4 | 11 | não |  |
| [public.ai_usage_events](tables/public/ai_usage_events.md) | table | sim | 2 | 6 | não |  |
| [public.ai_usage_logs](tables/public/ai_usage_logs.md) | table | sim | 3 | 13 | não |  |
| [public.ai_usage_quotas](tables/public/ai_usage_quotas.md) | table | sim | 4 | 6 | não |  |
| [public.art_file_attachments](tables/public/art_file_attachments.md) | table | sim | 4 | 13 | não |  |
| [public.audit_log](tables/public/audit_log.md) | table | sim | 2 | 10 | não |  |
| [public.bitrix_clients](tables/public/bitrix_clients.md) | table | sim | 1 | 16 | não |  |
| [public.bitrix_deals](tables/public/bitrix_deals.md) | table | sim | 1 | 11 | não |  |
| [public.bitrix_sync_logs](tables/public/bitrix_sync_logs.md) | table | sim | 1 | 8 | não |  |
| [public.blog_posts](tables/public/blog_posts.md) | table | sim | 4 | 12 | não |  |
| [public.bot_detection_log](tables/public/bot_detection_log.md) | table | sim | 2 | 9 | não |  |
| [public.campaigns](tables/public/campaigns.md) | table | sim | 1 | 9 | não |  |
| [public.cart_items](tables/public/cart_items.md) | table | sim | 1 | 12 | não |  |
| [public.cart_templates](tables/public/cart_templates.md) | table | sim | 1 | 7 | não |  |
| [public.catalog_marketing_terms](tables/public/catalog_marketing_terms.md) | table | sim | 4 | 11 | não | Vocabulário editorial do portal para classificar produtos externos sem alterar o cadastro mestre. |
| [public.catalog_product_marketing](tables/public/catalog_product_marketing.md) | table | sim | 3 | 4 | não | Associa produtos do catálogo externo a termos editoriais do portal Sicoob. |
| [public.category_icons](tables/public/category_icons.md) | table | sim | 4 | 7 | não |  |
| [public.city_whitelist](tables/public/city_whitelist.md) | table | sim | 1 | 8 | não |  |
| [public.cms_banners](tables/public/cms_banners.md) | table | sim | 5 | 11 | não |  |
| [public.cms_config](tables/public/cms_config.md) | table | sim | 4 | 4 | não |  |
| [public.cms_sections](tables/public/cms_sections.md) | table | sim | 5 | 8 | não |  |
| [public.collection_item_reactions](tables/public/collection_item_reactions.md) | table | sim | 2 | 8 | não |  |
| [public.collection_items](tables/public/collection_items.md) | table | sim | 4 | 10 | não |  |
| [public.collection_items_trash](tables/public/collection_items_trash.md) | table | sim | 3 | 13 | não |  |
| [public.collections](tables/public/collections.md) | table | sim | 4 | 14 | não |  |
| [public.comparison_reactions](tables/public/comparison_reactions.md) | table | sim | 2 | 8 | não |  |
| [public.component_media](tables/public/component_media.md) | table | sim | 4 | 10 | não |  |
| [public.connection_test_history](tables/public/connection_test_history.md) | table | sim | 3 | 21 | não |  |
| [public.cooperativa_budgets](tables/public/cooperativa_budgets.md) | table | sim | 9 | 9 | não |  |
| [public.cooperativas](tables/public/cooperativas.md) | table | sim | 4 | 15 | não |  |
| [public.cooperativas_parceiras](tables/public/cooperativas_parceiras.md) | table | sim | 1 | 9 | não |  |
| [public.coupons](tables/public/coupons.md) | table | sim | 1 | 13 | não |  |
| [public.custom_kits](tables/public/custom_kits.md) | table | sim | 4 | 23 | sim |  |
| [public.device_login_notifications](tables/public/device_login_notifications.md) | table | sim | 1 | 9 | sim |  |
| [public.discount_approval_requests](tables/public/discount_approval_requests.md) | table | sim | 1 | 15 | sim |  |
| [public.e2e_cleanup_audit](tables/public/e2e_cleanup_audit.md) | table | sim | 1 | 16 | não |  |
| [public.e2e_cleanup_rate_limit](tables/public/e2e_cleanup_rate_limit.md) | table | sim | 8 | 4 | não |  |
| [public.expert_conversations](tables/public/expert_conversations.md) | table | sim | 1 | 6 | não |  |
| [public.expert_messages](tables/public/expert_messages.md) | table | sim | 1 | 5 | não |  |
| [public.export_audit_log](tables/public/export_audit_log.md) | table | sim | 1 | 9 | não |  |
| [public.export_jobs](tables/public/export_jobs.md) | table | sim | 2 | 14 | não |  |
| [public.external_connections](tables/public/external_connections.md) | table | sim | 1 | 15 | não |  |
| [public.external_connections_sync_log](tables/public/external_connections_sync_log.md) | table | sim | 1 | 13 | não |  |
| [public.favorite_item_reactions](tables/public/favorite_item_reactions.md) | table | sim | 2 | 8 | não |  |
| [public.favorite_items](tables/public/favorite_items.md) | table | sim | 4 | 11 | não |  |
| [public.favorite_items_trash](tables/public/favorite_items_trash.md) | table | sim | 1 | 11 | não |  |
| [public.favorite_lists](tables/public/favorite_lists.md) | table | sim | 4 | 15 | não |  |
| [public.file_scan_logs](tables/public/file_scan_logs.md) | table | sim | 1 | 8 | não |  |
| [public.follow_up_reminders](tables/public/follow_up_reminders.md) | table | sim | 1 | 12 | não |  |
| [public.generated_mockups](tables/public/generated_mockups.md) | table | sim | 1 | 20 | não |  |
| [public.hardening_health_snapshots](tables/public/hardening_health_snapshots.md) | table | sim | 1 | 7 | não |  |
| [public.inbound_webhook_endpoints](tables/public/inbound_webhook_endpoints.md) | table | sim | 1 | 14 | não |  |
| [public.inbound_webhook_events](tables/public/inbound_webhook_events.md) | table | sim | 2 | 9 | não |  |
| [public.integration_credentials](tables/public/integration_credentials.md) | table | sim | 4 | 9 | sim |  |
| [public.ip_access_control](tables/public/ip_access_control.md) | table | sim | 2 | 8 | não |  |
| [public.ip_whitelist](tables/public/ip_whitelist.md) | table | sim | 1 | 7 | não |  |
| [public.kit_collaborators](tables/public/kit_collaborators.md) | table | sim | 4 | 8 | não |  |
| [public.kit_comments](tables/public/kit_comments.md) | table | sim | 4 | 9 | sim |  |
| [public.kit_share_tokens](tables/public/kit_share_tokens.md) | table | sim | 1 | 11 | não |  |
| [public.kit_templates](tables/public/kit_templates.md) | table | sim | 4 | 18 | não |  |
| [public.kit_variants](tables/public/kit_variants.md) | table | sim | 4 | 11 | não |  |
| [public.limit_increase_requests](tables/public/limit_increase_requests.md) | table | sim | 2 | 11 | não |  |
| [public.login_attempts](tables/public/login_attempts.md) | table | sim | 3 | 8 | sim |  |
| [public.magic_up_brand_kits](tables/public/magic_up_brand_kits.md) | table | sim | 4 | 15 | não |  |
| [public.magic_up_campaigns](tables/public/magic_up_campaigns.md) | table | sim | 4 | 15 | não |  |
| [public.magic_up_comments](tables/public/magic_up_comments.md) | table | sim | 4 | 7 | não |  |
| [public.magic_up_generations](tables/public/magic_up_generations.md) | table | sim | 1 | 22 | não |  |
| [public.magic_up_public_shares](tables/public/magic_up_public_shares.md) | table | sim | 4 | 12 | não |  |
| [public.magic_up_reactions](tables/public/magic_up_reactions.md) | table | sim | 4 | 7 | não |  |
| [public.manager_notification_config](tables/public/manager_notification_config.md) | table | sim | 1 | 6 | não |  |
| [public.mcp_access_violations](tables/public/mcp_access_violations.md) | table | sim | 1 | 11 | não |  |
| [public.mcp_api_keys](tables/public/mcp_api_keys.md) | table | sim | 4 | 13 | não |  |
| [public.mcp_full_grantors](tables/public/mcp_full_grantors.md) | table | sim | 4 | 4 | não |  |
| [public.mcp_key_auto_revocations](tables/public/mcp_key_auto_revocations.md) | table | sim | 1 | 7 | não |  |
| [public.mockup_drafts](tables/public/mockup_drafts.md) | table | sim | 1 | 13 | não |  |
| [public.mockup_prompt_configs](tables/public/mockup_prompt_configs.md) | table | sim | 1 | 10 | não |  |
| [public.mockup_prompt_history](tables/public/mockup_prompt_history.md) | table | sim | 2 | 10 | não |  |
| [public.mockup_templates](tables/public/mockup_templates.md) | table | sim | 4 | 14 | não |  |
| [public.newsletter_subscribers](tables/public/newsletter_subscribers.md) | table | sim | 5 | 7 | não |  |
| [public.notification_channels](tables/public/notification_channels.md) | table | sim | 4 | 6 | não |  |
| [public.notification_digests](tables/public/notification_digests.md) | table | sim | 1 | 9 | não |  |
| [public.notification_logs](tables/public/notification_logs.md) | table | sim | 1 | 8 | não |  |
| [public.notification_preferences](tables/public/notification_preferences.md) | table | sim | 1 | 11 | não | Preferências privadas de entrega e agrupamento de notificações de cada usuário. |
| [public.notification_templates](tables/public/notification_templates.md) | table | sim | 1 | 9 | não |  |
| [public.notifications](tables/public/notifications.md) | table | sim | 4 | 25 | sim |  |
| [public.optimization_queue](tables/public/optimization_queue.md) | table | sim | 1 | 14 | não |  |
| [public.optimization_queue_runs](tables/public/optimization_queue_runs.md) | table | sim | 1 | 8 | não |  |
| [public.order_approval_history](tables/public/order_approval_history.md) | table | sim | 2 | 8 | não |  |
| [public.order_audit_events](tables/public/order_audit_events.md) | table | sim | 4 | 13 | não |  |
| [public.order_comments](tables/public/order_comments.md) | table | sim | 5 | 12 | não |  |
| [public.order_consolidation_orders](tables/public/order_consolidation_orders.md) | table | sim | 1 | 4 | não |  |
| [public.order_consolidations](tables/public/order_consolidations.md) | table | sim | 1 | 11 | não |  |
| [public.order_duplicate_requests](tables/public/order_duplicate_requests.md) | table | sim | 1 | 6 | não |  |
| [public.order_invoices](tables/public/order_invoices.md) | table | sim | 4 | 15 | não |  |
| [public.order_items](tables/public/order_items.md) | table | sim | 4 | 10 | não |  |
| [public.order_logistics](tables/public/order_logistics.md) | table | sim | 4 | 11 | não |  |
| [public.order_logistics_tracking](tables/public/order_logistics_tracking.md) | table | sim | 5 | 15 | não |  |
| [public.order_payments](tables/public/order_payments.md) | table | sim | 4 | 12 | não |  |
| [public.order_pilot_approvals](tables/public/order_pilot_approvals.md) | table | sim | 5 | 14 | não |  |
| [public.order_template_items](tables/public/order_template_items.md) | table | sim | 5 | 10 | não |  |
| [public.order_templates](tables/public/order_templates.md) | table | sim | 5 | 11 | não |  |
| [public.orders](tables/public/orders.md) | table | sim | 4 | 28 | sim |  |
| [public.organization_members](tables/public/organization_members.md) | table | sim | 4 | 8 | não |  |
| [public.organizations](tables/public/organizations.md) | table | sim | 3 | 9 | não |  |
| [public.outbound_webhooks](tables/public/outbound_webhooks.md) | table | sim | 1 | 17 | não |  |
| [public.ownership_audit_reports](tables/public/ownership_audit_reports.md) | table | sim | 3 | 11 | não |  |
| [public.ownership_repair_logs](tables/public/ownership_repair_logs.md) | table | sim | 1 | 13 | não |  |
| [public.pa_budgets](tables/public/pa_budgets.md) | table | sim | 10 | 10 | não |  |
| [public.pa_category_thresholds](tables/public/pa_category_thresholds.md) | table | sim | 4 | 5 | não |  |
| [public.pa_notification_settings](tables/public/pa_notification_settings.md) | table | sim | 4 | 7 | não |  |
| [public.pa_singularidades](tables/public/pa_singularidades.md) | table | sim | 4 | 7 | não |  |
| [public.password_reset_requests](tables/public/password_reset_requests.md) | table | sim | 4 | 8 | não |  |
| [public.permissions](tables/public/permissions.md) | table | sim | 4 | 7 | não |  |
| [public.personalization_simulations](tables/public/personalization_simulations.md) | table | sim | 4 | 12 | não |  |
| [public.pontos_atendimento](tables/public/pontos_atendimento.md) | table | sim | 4 | 10 | não |  |
| [public.portfolio_items](tables/public/portfolio_items.md) | table | sim | 4 | 11 | não |  |
| [public.postos_atendimento](tables/public/postos_atendimento.md) | table | sim | 4 | 11 | não |  |
| [public.price_history](tables/public/price_history.md) | table | sim | 1 | 5 | não |  |
| [public.product_categories](tables/public/product_categories.md) | table | sim | 5 | 11 | não |  |
| [public.product_component_location_techniques](tables/public/product_component_location_techniques.md) | table | sim | 4 | 8 | não |  |
| [public.product_component_locations](tables/public/product_component_locations.md) | table | sim | 4 | 14 | não |  |
| [public.product_components](tables/public/product_components.md) | table | sim | 4 | 10 | não |  |
| [public.product_group_components](tables/public/product_group_components.md) | table | sim | 4 | 8 | não |  |
| [public.product_group_location_techniques](tables/public/product_group_location_techniques.md) | table | sim | 4 | 8 | não |  |
| [public.product_group_locations](tables/public/product_group_locations.md) | table | sim | 4 | 10 | não |  |
| [public.product_group_members](tables/public/product_group_members.md) | table | sim | 4 | 6 | não |  |
| [public.product_groups](tables/public/product_groups.md) | table | sim | 4 | 8 | não |  |
| [public.product_price_freshness_overrides](tables/public/product_price_freshness_overrides.md) | table | sim | 4 | 6 | não |  |
| [public.product_sync_logs](tables/public/product_sync_logs.md) | table | sim | 2 | 12 | não |  |
| [public.product_views](tables/public/product_views.md) | table | sim | 2 | 7 | sim |  |
| [public.profiles](tables/public/profiles.md) | table | sim | 3 | 20 | não |  |
| [public.public_token_failures](tables/public/public_token_failures.md) | table | sim | 2 | 8 | não |  |
| [public.qa_release_evidences](tables/public/qa_release_evidences.md) | table | sim | 4 | 8 | não |  |
| [public.qa_releases](tables/public/qa_releases.md) | table | sim | 4 | 8 | não |  |
| [public.qa_rls_audits](tables/public/qa_rls_audits.md) | table | sim | 1 | 8 | não |  |
| [public.qa_run_steps](tables/public/qa_run_steps.md) | table | sim | 4 | 6 | não |  |
| [public.qa_runs](tables/public/qa_runs.md) | table | sim | 2 | 9 | não |  |
| [public.query_telemetry](tables/public/query_telemetry.md) | table | sim | 3 | 23 | não |  |
| [public.quote_approval_evidence_keys](tables/public/quote_approval_evidence_keys.md) | table | sim | 1 | 5 | não |  |
| [public.quote_approval_tokens](tables/public/quote_approval_tokens.md) | table | sim | 4 | 24 | não |  |
| [public.quote_audit_logs](tables/public/quote_audit_logs.md) | table | sim | 1 | 8 | não |  |
| [public.quote_comments](tables/public/quote_comments.md) | table | sim | 4 | 8 | não |  |
| [public.quote_consolidations](tables/public/quote_consolidations.md) | table | sim | 1 | 7 | não |  |
| [public.quote_history](tables/public/quote_history.md) | table | sim | 1 | 10 | não | Trilha de auditoria imutável de orçamentos; usuários autenticados apenas inserem eventos em seu próprio nome. |
| [public.quote_item_personalizations](tables/public/quote_item_personalizations.md) | table | sim | 4 | 17 | não |  |
| [public.quote_items](tables/public/quote_items.md) | table | sim | 4 | 31 | não |  |
| [public.quote_save_idempotency](tables/public/quote_save_idempotency.md) | table | sim | 2 | 5 | não |  |
| [public.quote_templates](tables/public/quote_templates.md) | table | sim | 4 | 19 | não |  |
| [public.quotes](tables/public/quotes.md) | table | sim | 4 | 57 | sim |  |
| [public.request_rate_limits](tables/public/request_rate_limits.md) | table | sim | 2 | 8 | não |  |
| [public.rls_denial_log](tables/public/rls_denial_log.md) | table | sim | 4 | 16 | não |  |
| [public.role_migration_batches](tables/public/role_migration_batches.md) | table | sim | 4 | 14 | não |  |
| [public.role_migration_items](tables/public/role_migration_items.md) | table | sim | 4 | 12 | não |  |
| [public.role_permissions](tables/public/role_permissions.md) | table | sim | 4 | 4 | não |  |
| [public.sales_goals](tables/public/sales_goals.md) | table | sim | 4 | 15 | não |  |
| [public.saved_filters](tables/public/saved_filters.md) | table | sim | 4 | 11 | não |  |
| [public.saved_trends_views](tables/public/saved_trends_views.md) | table | sim | 1 | 6 | não |  |
| [public.scheduled_exports](tables/public/scheduled_exports.md) | table | sim | 1 | 11 | não |  |
| [public.scheduled_notifications](tables/public/scheduled_notifications.md) | table | sim | 1 | 11 | não |  |
| [public.scheduled_reports](tables/public/scheduled_reports.md) | table | sim | 4 | 12 | não |  |
| [public.search_analytics](tables/public/search_analytics.md) | table | sim | 2 | 8 | sim | Telemetria imutável de buscas: authenticated possui apenas SELECT/INSERT sujeitos à RLS. |
| [public.secret_rotation_log](tables/public/secret_rotation_log.md) | table | sim | 2 | 8 | não |  |
| [public.seller_cart_items](tables/public/seller_cart_items.md) | table | sim | 1 | 14 | não |  |
| [public.seller_carts](tables/public/seller_carts.md) | table | sim | 1 | 10 | não |  |
| [public.seller_discount_limits](tables/public/seller_discount_limits.md) | table | sim | 4 | 7 | não |  |
| [public.sensitive_access_logs](tables/public/sensitive_access_logs.md) | table | sim | 1 | 7 | não |  |
| [public.sicoob_approval_delegations](tables/public/sicoob_approval_delegations.md) | table | sim | 1 | 13 | não |  |
| [public.sicoob_approval_deliveries](tables/public/sicoob_approval_deliveries.md) | table | sim | 1 | 20 | não |  |
| [public.sicoob_approval_delivery_archive](tables/public/sicoob_approval_delivery_archive.md) | table | sim | 1 | 5 | não |  |
| [public.sicoob_approval_policies](tables/public/sicoob_approval_policies.md) | table | sim | 1 | 10 | não | Políticas versionadas por cooperativa. A ausência de política formal usa somente a base técnica conservadora. |
| [public.sicoob_approval_requests](tables/public/sicoob_approval_requests.md) | table | sim | 3 | 14 | não |  |
| [public.sicoob_approval_worker_dispatches](tables/public/sicoob_approval_worker_dispatches.md) | table | sim | 1 | 7 | não |  |
| [public.sicoob_centrais](tables/public/sicoob_centrais.md) | table | sim | 1 | 8 | não |  |
| [public.sicoob_delivery_allocations](tables/public/sicoob_delivery_allocations.md) | table | sim | 1 | 8 | não |  |
| [public.sicoob_delivery_destinations](tables/public/sicoob_delivery_destinations.md) | table | sim | 1 | 6 | não |  |
| [public.sicoob_delivery_receipt_events](tables/public/sicoob_delivery_receipt_events.md) | table | sim | 1 | 9 | não |  |
| [public.sicoob_document_registry](tables/public/sicoob_document_registry.md) | table | sim | 1 | 18 | não | Registro imutável da inspeção por bytes e antimalware antes da promoção ao bucket final privado. |
| [public.sicoob_invitation_events](tables/public/sicoob_invitation_events.md) | table | sim | 1 | 8 | não |  |
| [public.sicoob_invitations](tables/public/sicoob_invitations.md) | table | sim | 1 | 19 | não |  |
| [public.sicoob_kit_quote_requests](tables/public/sicoob_kit_quote_requests.md) | table | sim | 1 | 6 | não |  |
| [public.sicoob_manager_audit](tables/public/sicoob_manager_audit.md) | table | sim | 1 | 7 | não |  |
| [public.sicoob_order_artwork_versions](tables/public/sicoob_order_artwork_versions.md) | table | sim | 1 | 13 | não |  |
| [public.sicoob_order_history](tables/public/sicoob_order_history.md) | table | sim | 2 | 7 | não |  |
| [public.sicoob_order_invoices](tables/public/sicoob_order_invoices.md) | table | sim | 1 | 11 | não |  |
| [public.sicoob_order_item_logs](tables/public/sicoob_order_item_logs.md) | table | sim | 1 | 8 | não |  |
| [public.sicoob_order_items](tables/public/sicoob_order_items.md) | table | sim | 1 | 18 | não |  |
| [public.sicoob_order_payments](tables/public/sicoob_order_payments.md) | table | sim | 1 | 17 | não |  |
| [public.sicoob_order_shipments](tables/public/sicoob_order_shipments.md) | table | sim | 1 | 13 | não |  |
| [public.sicoob_orders](tables/public/sicoob_orders.md) | table | sim | 4 | 32 | sim |  |
| [public.sicoob_performance_reports](tables/public/sicoob_performance_reports.md) | table | sim | 1 | 8 | não |  |
| [public.sicoob_quote_reorder_requests](tables/public/sicoob_quote_reorder_requests.md) | table | sim | 1 | 7 | não |  |
| [public.sicoob_reorder_requests](tables/public/sicoob_reorder_requests.md) | table | sim | 1 | 7 | não |  |
| [public.sicoob_rls_audit_logs](tables/public/sicoob_rls_audit_logs.md) | table | sim | 1 | 6 | não |  |
| [public.sicoob_temas](tables/public/sicoob_temas.md) | table | sim | 1 | 5 | não |  |
| [public.simulator_wizard_drafts](tables/public/simulator_wizard_drafts.md) | table | sim | 4 | 9 | não |  |
| [public.singulares](tables/public/singulares.md) | table | sim | 1 | 9 | não |  |
| [public.step_up_audit_log](tables/public/step_up_audit_log.md) | table | sim | 1 | 11 | não |  |
| [public.step_up_challenges](tables/public/step_up_challenges.md) | table | sim | 1 | 14 | não |  |
| [public.step_up_tokens](tables/public/step_up_tokens.md) | table | sim | 1 | 10 | não |  |
| [public.system_settings](tables/public/system_settings.md) | table | sim | 4 | 7 | não |  |
| [public.telemetry_events](tables/public/telemetry_events.md) | table | sim | 2 | 9 | não |  |
| [public.telemetry_logs](tables/public/telemetry_logs.md) | table | sim | 2 | 7 | não |  |
| [public.test_suites_runs](tables/public/test_suites_runs.md) | table | sim | 1 | 5 | não |  |
| [public.user_comparisons](tables/public/user_comparisons.md) | table | sim | 4 | 12 | não |  |
| [public.user_known_devices](tables/public/user_known_devices.md) | table | sim | 1 | 13 | não |  |
| [public.user_onboarding](tables/public/user_onboarding.md) | table | sim | 4 | 9 | não |  |
| [public.user_preferences](tables/public/user_preferences.md) | table | sim | 3 | 7 | não |  |
| [public.user_roles](tables/public/user_roles.md) | table | sim | 4 | 3 | não |  |
| [public.video_variant_links](tables/public/video_variant_links.md) | table | sim | 4 | 8 | não |  |
| [public.voice_command_logs](tables/public/voice_command_logs.md) | table | sim | 2 | 9 | não |  |
| [public.webhook_configs](tables/public/webhook_configs.md) | table | sim | 1 | 14 | não |  |
| [public.webhook_deliveries](tables/public/webhook_deliveries.md) | table | sim | 2 | 11 | não |  |
| [public.webhook_delivery_metrics](tables/public/webhook_delivery_metrics.md) | table | sim | 8 | 15 | não |  |
| [public.webhook_logs](tables/public/webhook_logs.md) | table | sim | 1 | 9 | não |  |
| [public.webhook_retry_claims](tables/public/webhook_retry_claims.md) | table | sim | 0 | 7 | não | Reserva durável de tentativas antes do enqueue assíncrono; não representa uma entrega nem participa das métricas de sucesso/falha. |
| [public.workspace_notifications](tables/public/workspace_notifications.md) | table | sim | 4 | 10 | não |  |
