# 11 · GLOSSÁRIO, DADOS DE REFERÊNCIA E LACUNAS

> Gerado automaticamente por AI Context Sync v1.3.2 · commit `57346a6422` · branch `main` · 2026-11-18 21:57 UTC
> Não edite à mão — regras humanas vão em `manual/`.

## Glossário do domínio (entidades do sistema)

| Termo | Significado / valores | Tamanho | Origem |
|---|---|---|---|
| `_backup_custom_kits_pinned_20261118` | Estado de is_pinned/last_used_at/updated_at dos kits fixados imediatamente antes de 20261118130400_pin_custom_kit_atomically. RLS habilitada sem policy: somente superusuario e o owner da tabela leem. | 6 colunas | migration |
| `_sicoob_rls_target_tables` | _(sem COMMENT ON TABLE — significado não documentado)_ | 1 colunas | migration |
| `access_blocked_log` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `access_security_settings` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `achievements` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `admin_audit_log` | _(sem COMMENT ON TABLE — significado não documentado)_ | 18 colunas | migration |
| `admin_audit_log_default` | _(sem COMMENT ON TABLE — significado não documentado)_ | 18 colunas | types.ts |
| `admin_audit_log_y2024` | _(sem COMMENT ON TABLE — significado não documentado)_ | 18 colunas | types.ts |
| `admin_audit_log_y2025` | _(sem COMMENT ON TABLE — significado não documentado)_ | 18 colunas | types.ts |
| `admin_audit_log_y2026_m01` | _(sem COMMENT ON TABLE — significado não documentado)_ | 18 colunas | types.ts |
| `admin_audit_log_y2026_m02` | _(sem COMMENT ON TABLE — significado não documentado)_ | 18 colunas | types.ts |
| `admin_audit_log_y2026_m03` | _(sem COMMENT ON TABLE — significado não documentado)_ | 18 colunas | types.ts |
| `admin_audit_log_y2026_m04` | _(sem COMMENT ON TABLE — significado não documentado)_ | 18 colunas | types.ts |
| `admin_audit_log_y2026_m05` | _(sem COMMENT ON TABLE — significado não documentado)_ | 18 colunas | types.ts |
| `admin_audit_log_y2026_m06` | _(sem COMMENT ON TABLE — significado não documentado)_ | 18 colunas | types.ts |
| `admin_audit_log_y2026_m07` | _(sem COMMENT ON TABLE — significado não documentado)_ | 18 colunas | types.ts |
| `admin_audit_log_y2026_m08` | _(sem COMMENT ON TABLE — significado não documentado)_ | 18 colunas | types.ts |
| `admin_audit_log_y2026_m09` | _(sem COMMENT ON TABLE — significado não documentado)_ | 18 colunas | types.ts |
| `admin_audit_log_y2026_m10` | _(sem COMMENT ON TABLE — significado não documentado)_ | 18 colunas | types.ts |
| `admin_audit_log_y2026_m11` | _(sem COMMENT ON TABLE — significado não documentado)_ | 18 colunas | types.ts |
| `admin_audit_log_y2026_m12` | _(sem COMMENT ON TABLE — significado não documentado)_ | 18 colunas | types.ts |
| `admin_audit_log_y2027_m01` | _(sem COMMENT ON TABLE — significado não documentado)_ | 18 colunas | types.ts |
| `admin_audit_log_y2027_m02` | _(sem COMMENT ON TABLE — significado não documentado)_ | 18 colunas | types.ts |
| `admin_audit_log_y2027_m03` | _(sem COMMENT ON TABLE — significado não documentado)_ | 18 colunas | types.ts |
| `admin_config_audit` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `admin_settings` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `ai_insights_cache` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `ai_usage_events` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `ai_usage_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `ai_usage_quotas` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `analytics_events` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | migration |
| `art_file_attachments` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `audit_log` | Registro de auditoria para todas as alterações no sistema | 10 colunas | migration |
| `audit_trail` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | migration |
| `bitrix_clients` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `bitrix_deals` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `bitrix_sync_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `blog_posts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `bot_detection_log` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `cache_entries` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | migration |
| `campaigns` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `cart_items` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `cart_templates` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `catalog_marketing_term_usage` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | types.ts |
| `catalog_marketing_terms` | Vocabulário editorial do portal para classificar produtos externos sem alterar o cadastro mestre. | 11 colunas | migration |
| `catalog_product_marketing` | Associa produtos do catálogo externo a termos editoriais do portal Sicoob. | 4 colunas | migration |
| `categories` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `category_icons` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `city_whitelist` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `clients` | _(sem COMMENT ON TABLE — significado não documentado)_ | 1 colunas | migration |
| `cms_banners` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `cms_config` | _(sem COMMENT ON TABLE — significado não documentado)_ | 4 colunas | migration |
| `cms_sections` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `collection_item_reactions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `collection_items` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `collection_items_trash` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `collections` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `color_groups` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `color_nuances` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `color_variations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `companies` | _(sem COMMENT ON TABLE — significado não documentado)_ | 41 colunas | migration |
| `company_addresses` | _(sem COMMENT ON TABLE — significado não documentado)_ | 18 colunas | migration |
| `company_contacts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 19 colunas | migration |
| `comparison_reactions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `component_media` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `connection_test_history` | _(sem COMMENT ON TABLE — significado não documentado)_ | 21 colunas | migration |
| `contact_emails` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `contact_phones` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `cooperativa_budgets` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `cooperativas` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `cooperativas_parceiras` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `coupons` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `custom_kits` | _(sem COMMENT ON TABLE — significado não documentado)_ | 23 colunas | migration |
| `device_login_notifications` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `discount_approval_requests` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `e2e_cleanup_audit` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `e2e_cleanup_rate_limit` | Rate limit interno do edge e2e-cleanup. Acesso exclusivo via service_role / RPC SECURITY DEFINER. Policies explícitas negam anon/authenticated por defesa em profundidade. | 4 colunas | migration |
| `entity_versions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `expert_conversations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `expert_messages` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `export_audit_log` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `export_jobs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `external_connections` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `external_connections_sync_log` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `favorite_item_reactions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `favorite_items` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `favorite_items_trash` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `favorite_lists` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `feature_flags` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | migration |
| `file_scan_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `follow_up_reminders` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `future_stock_entries` | _(sem COMMENT ON TABLE — significado não documentado)_ | 21 colunas | migration |
| `generated_mockups` | _(sem COMMENT ON TABLE — significado não documentado)_ | 20 colunas | migration |
| `geo_allowed_countries` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `hardening_health_snapshots` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `inbound_webhook_endpoints` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `inbound_webhook_events` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `integration_credentials` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `ip_access_control` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `ip_whitelist` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `kit_collaborators` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `kit_comments` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `kit_share_tokens` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `kit_templates` | _(sem COMMENT ON TABLE — significado não documentado)_ | 18 colunas | migration |
| `kit_variants` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `limit_increase_requests` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `login_attempts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `logistics_tracking` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `magic_up_brand_kits` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `magic_up_campaigns` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `magic_up_comments` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `magic_up_generations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 22 colunas | migration |
| `magic_up_public_shares` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `magic_up_reactions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `manager_notification_config` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `mcp_access_violations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `mcp_api_keys` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `mcp_full_grantors` | Whitelist explícita de admins autorizados a emitir/escalar chaves MCP com escopo "*" (Full Access). | 4 colunas | migration |
| `mcp_key_auto_revocations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `mockup_drafts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `mockup_prompt_configs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `mockup_prompt_history` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `mockup_templates` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `newsletter_subscribers` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `notification_channels` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `notification_digests` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `notification_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `notification_preferences` | Preferências privadas de entrega e agrupamento de notificações de cada usuário. | 11 colunas | migration |
| `notification_templates` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `notifications` | _(sem COMMENT ON TABLE — significado não documentado)_ | 25 colunas | migration |
| `optimization_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | migration |
| `optimization_queue` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `optimization_queue_runs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `order_approval_history` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `order_audit_events` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `order_comments` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `order_consolidation_orders` | _(sem COMMENT ON TABLE — significado não documentado)_ | 4 colunas | migration |
| `order_consolidations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `order_duplicate_requests` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `order_history` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `order_invoices` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `order_items` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `order_logistics` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `order_logistics_tracking` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `order_payments` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `order_pilot_approvals` | _(sem COMMENT ON TABLE — significado não documentado)_ | 18 colunas | migration |
| `order_template_items` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `order_templates` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `orders` | _(sem COMMENT ON TABLE — significado não documentado)_ | 28 colunas | migration |
| `organization_members` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `organizations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `outbound_webhooks` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | migration |
| `ownership_audit_reports` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `ownership_repair_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `pa_budgets` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `pa_category_thresholds` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `pa_notification_settings` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `pa_singularidades` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `password_reset_requests` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `permissions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `personalization_locations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `personalization_simulations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `personalization_sizes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `personalization_techniques` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `pontos_atendimento` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `portfolio_items` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `postos_atendimento` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `price_history` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `product_categories` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `product_component_location_techniques` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `product_component_locations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `product_components` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `product_group_components` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `product_group_location_techniques` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `product_group_locations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `product_group_members` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `product_groups` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `product_novelties` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `product_price_freshness_overrides` | Override local da janela de validade de preço por produto (30/60/90 dias). Sobrescreve o valor padrão de 60 dias e tem precedência sobre qualquer valor que venha a ser exposto pelo BD externo no futuro. | 6 colunas | migration |
| `product_sync_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `product_views` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `products` | _(sem COMMENT ON TABLE — significado não documentado)_ | 32 colunas | migration |
| `profiles` | _(sem COMMENT ON TABLE — significado não documentado)_ | 20 colunas | migration |
| `public_token_failures` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `push_subscriptions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `qa_release_evidences` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `qa_releases` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `qa_rls_audits` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `qa_run_steps` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `qa_runs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `query_telemetry` | _(sem COMMENT ON TABLE — significado não documentado)_ | 23 colunas | migration |
| `quote_approval_evidence_keys` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `quote_approval_tokens` | _(sem COMMENT ON TABLE — significado não documentado)_ | 24 colunas | migration |
| `quote_audit_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `quote_comments` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `quote_consolidations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `quote_history` | Trilha de auditoria imutável de orçamentos; usuários autenticados apenas inserem eventos em seu próprio nome. | 10 colunas | migration |
| `quote_item_personalizations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | migration |
| `quote_items` | _(sem COMMENT ON TABLE — significado não documentado)_ | 31 colunas | migration |
| `quote_number_counters` | _(sem COMMENT ON TABLE — significado não documentado)_ | 2 colunas | migration |
| `quote_save_idempotency` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `quote_templates` | _(sem COMMENT ON TABLE — significado não documentado)_ | 19 colunas | migration |
| `quotes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 57 colunas | migration |
| `rate_limits` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | migration |
| `redis_config` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | migration |
| `request_rate_limits` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `rls_denial_log` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `role_migration_batches` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `role_migration_items` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `role_permissions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 4 colunas | migration |
| `roles` | _(sem COMMENT ON TABLE — significado não documentado)_ | 4 colunas | migration |
| `sales_goals` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `saved_filters` | Filtros salvos por usuários para diferentes entidades | 11 colunas | migration |
| `saved_trends_views` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `scheduled_exports` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `scheduled_notifications` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `scheduled_reports` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `search_analytics` | Telemetria imutável de buscas: authenticated possui apenas SELECT/INSERT sujeitos à RLS. | 8 colunas | migration |
| `secret_rotation_log` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `security_settings` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `seller_achievements` | _(sem COMMENT ON TABLE — significado não documentado)_ | 4 colunas | migration |
| `seller_cart_items` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `seller_carts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `seller_discount_limits` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `seller_gamification` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `sensitive_access_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `sicoob_approval_delegations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `sicoob_approval_deliveries` | _(sem COMMENT ON TABLE — significado não documentado)_ | 20 colunas | migration |
| `sicoob_approval_delivery_archive` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `sicoob_approval_policies` | Políticas versionadas por cooperativa. A ausência de política formal usa somente a base técnica conservadora. | 10 colunas | migration |
| `sicoob_approval_requests` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `sicoob_approval_worker_dispatches` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `sicoob_budget_audit` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | types.ts |
| `sicoob_centrais` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `sicoob_delivery_allocations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `sicoob_delivery_destinations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `sicoob_delivery_receipt_events` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `sicoob_document_registry` | Registro imutável da inspeção por bytes e antimalware antes da promoção ao bucket final privado. | 18 colunas | migration |
| `sicoob_invitation_events` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `sicoob_invitations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 19 colunas | migration |
| `sicoob_kit_quote_requests` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `sicoob_manager_audit` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `sicoob_order_artwork_versions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `sicoob_order_history` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `sicoob_order_invoices` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `sicoob_order_item_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `sicoob_order_items` | _(sem COMMENT ON TABLE — significado não documentado)_ | 18 colunas | migration |
| `sicoob_order_payments` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | migration |
| `sicoob_order_shipments` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `sicoob_orders` | _(sem COMMENT ON TABLE — significado não documentado)_ | 32 colunas | migration |
| `sicoob_performance_reports` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `sicoob_quote_reorder_requests` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `sicoob_reorder_requests` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `sicoob_rls_audit_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `sicoob_temas` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `simulator_wizard_drafts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `singulares` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `step_up_audit_log` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `step_up_challenges` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `step_up_tokens` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `store_rewards` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `suppliers` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `sync_jobs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `system_settings` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `telemetry_events` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `telemetry_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `telemetry_query_performance` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | types.ts |
| `template_versions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | migration |
| `test_suites_runs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `two_factor_secrets` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | migration |
| `user_2fa_settings` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `user_allowed_ips` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `user_comparisons` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `user_filter_presets` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `user_known_devices` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `user_onboarding` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `user_passkeys` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `user_preferences` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `user_rewards` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `user_roles` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | migration |
| `v_full_scope_grants` | _(sem COMMENT ON TABLE — significado não documentado)_ | 18 colunas | types.ts |
| `v_sicoob_hierarchy` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | types.ts |
| `video_variant_links` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `voice_command_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `webhook_configs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `webhook_deliveries` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `webhook_delivery_metrics` | Append-only webhook delivery telemetry. Written by edge functions via service_role. Used for OBSERVABILITY dashboards and alerts. | 15 colunas | migration |
| `webhook_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `webhook_retry_claims` | Reserva durável de tentativas antes do enqueue assíncrono; não representa uma entrega nem participa das métricas de sucesso/falha. | 7 colunas | migration |
| `websocket_sessions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | migration |
| `workspace_notifications` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `app_role` (enum) | Hierarquia ativa: dev > supervisor > vendedor (=agente no UI).  |  | banco |
| `quote_status` (enum) | draft, pending, sent, approved, rejected, expired, pending_approval, pending_singular_approval, approved_singular, rejected_singular, revision, viewed, converted |  | banco |
| `order_status` (enum) | pending, confirmed, in_production, ready_for_pickup, shipped, delivered, cancelled |  | banco |
| `fulfillment_status` (enum) | not_started, picking, packing, shipped, delivered |  | banco |
| `org_role` (enum) | owner, admin, member |  | banco |
| `step_up_action` (enum) | promote_dev, demote_dev, mcp_full_issue, mcp_full_escalate, secret_rotation, secret_revoke, mcp_key_revoke, mcp_key_rotate |  | banco |
| `role_migration_item_status` (enum) | pending, success, failed, skipped, dry_run |  | banco |
| `role_migration_status` (enum) | pending, running, completed, failed, partial, dry_run |  | banco |
| `DevAccessUserRole` (TS) | supervisor \| agente \| agent \| vendedor |  | `src/components/access/DevAccessDeniedPage.tsx` |
| … +171 linhas — lista completa em `context.json` | | | |

## Dados de referência (seed — planos, categorias, perfis fixos)

_nenhum item encontrado_

## Auditoria de consistência (código × schema) — trate como NÃO VERIFICADO

> `status`: inclui estados só de UI/realtime (ex.: `uploading`, `SUBSCRIBED`) que nunca vão ao banco — confira o arquivo antes de concluir que falta valor no enum.

| Tipo | Problema | Onde |
|---|---|---|
| status | valor `number` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/admin/ImageUploadButton.tsx`<br>`compara:src/components/admin/connections/SecretsManagerHealthPanel.tsx`<br>`compara:src/components/admin/connections/TestAllConnectionsButton.tsx`<br>`compara:src/components/admin/telemetry/BridgeCallDetailDrawer.tsx` |
| status | valor `step_up_error` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/admin/connections/IssueMcpKeyForm.tsx`<br>`compara:src/components/admin/security/keys/RotateMcpKeyDialog.tsx`<br>`compara:src/components/admin/security/keys/UpdateMcpKeyDialog.tsx`<br>`compara:src/pages/admin/DevChallengeExamplesPage.tsx` |
| status | valor `passed` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/admin/connections/SmokeTestChecklist.tsx`<br>`escreve:src/components/admin/connections/SmokeTestChecklist.tsx` |
| status | valor `Status` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/components/audit/AuditHistory.tsx` |
| status | valor `super` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/bi/ClientCategoryRadar.tsx`<br>`escreve:src/components/bi/ClientCategoryRadar.tsx` |
| status | valor `client-only` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/components/bi/ClientCategoryRadar.tsx` |
| status | valor `gap` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/bi/ClientCategoryRadar.tsx`<br>`escreve:src/components/bi/ClientCategoryRadar.tsx` |
| status | valor `underindex` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/bi/ClientCategoryRadar.tsx` |
| status | valor `in_stock` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/inventory/StockDashboard.tsx`<br>`compara:src/types/stock.ts`<br>`escreve:src/components/simulator/StockAlert.tsx` |
| status | valor `destructive` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/kit-builder/VolumeIndicator.tsx` |
| status | valor `current` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/mockup/GeneratingOverlay.tsx`<br>`compara:src/components/orders/MultiLevelTracker.tsx`<br>`compara:src/components/sicoob/orders/LogisticsCommandCenter.tsx` |
| status | valor `saving` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/quotes/QuoteAutoSave.tsx` |
| status | valor `saved` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/quotes/QuoteAutoSave.tsx` |
| status | valor `offline` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/quotes/QuoteAutoSave.tsx` |
| status | valor `Pendente` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/admin/AuditEvidenceDashboard.tsx`<br>`escreve:src/components/search/GlobalSearch.tsx`<br>`escreve:src/pages/admin/AuditEvidenceDashboard.tsx` |
| status | valor `verified` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/security/MfaChallengeDialog.tsx`<br>`compara:src/components/security/TwoFactorSetup.tsx`<br>`compara:src/hooks/use2FA.ts`<br>`compara:src/services/authService.ts` |
| status | valor `unverified` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/security/MfaEnrollmentDialog.tsx` |
| status | valor `SUBSCRIBED` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/hooks/useRealtimeSync.ts` |
| status | valor `connecting` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/hooks/useVoiceAgent.ts` |
| status | valor `disconnected` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/hooks/useVoiceAgent.ts` |
| status | valor `string` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/lib/cloud-status.ts`<br>`compara:src/lib/quote-status-config.ts`<br>`compara:supabase/functions/process-batch-export/index.ts` |
| status | valor `Achado` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/admin/AuditEvidenceDashboard.tsx`<br>`escreve:src/pages/admin/AuditEvidenceDashboard.tsx` |
| status | valor `failure` para `status` usado no código não existe em nenhum enum do banco/TS | `filtra:src/pages/admin/RLSAuditPage.tsx` |
| status | valor `pending_seller` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/sicoob/GestorConsolidatedOrdersPage.tsx` |
| status | valor `partially_received` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/sicoob/GestorConsolidatedOrdersPage.tsx` |
| status | valor `received` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/sicoob/GestorConsolidatedOrdersPage.tsx` |
| status | valor `received_with_issues` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/sicoob/GestorConsolidatedOrdersPage.tsx` |
| status | valor `in_progress` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/bitrix-sync/index.ts` |
| status | valor `scope_mismatch` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/e2e-cleanup/index.ts` |
| status | valor `alert_sent` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/error-monitor/index.ts` |
| status | valor `digested` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/send-notification/index.ts` |
| status | valor `local_sem_ledger` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:tests/scenarios/migration-ledger.mjs` |
| status | valor `nome_divergente` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:tests/scenarios/migration-ledger.mjs` |
| status | valor `alinhada` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:tests/scenarios/migration-ledger.mjs` |
| status | valor `versao_ativa_duplicada` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:tests/scenarios/migration-ledger.mjs` |
| status | valor `mixed` para `state` usado no código não existe em nenhum enum do banco/TS | `escreve:src/components/admin/connections/ConnectionRowSourceBadge.tsx` |
| status | valor `empty` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/admin/connections/ExpectedKeysMatchPanel.tsx` |
| status | valor `over` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/sicoob/orders/OrderBudgetIntelligence.tsx` |
| status | valor `expanded` para `state` usado no código não existe em nenhum enum do banco/TS | `escreve:src/components/ui/sidebar.tsx` |
| status | valor `collapsed` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/ui/sidebar.tsx` |
| status | valor `closed` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/hooks/voice/feedbackSounds.ts` |
| status | valor `suspended` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/hooks/voice/feedbackSounds.ts` |
| status | valor `installed` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/lib/sw-register.ts` |
| status | valor `booting` para `phase` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/search/voice/VoiceOrb.tsx` |
| status | valor `password` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/auth/StepUpAuthDialog.tsx` |
| status | valor `otp` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/auth/StepUpAuthDialog.tsx` |
| status | valor `intro` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/security/MfaEnrollmentDialog.tsx` |
| status | valor `qr` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/security/MfaEnrollmentDialog.tsx` |
| status | valor `verify` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/security/MfaEnrollmentDialog.tsx` |
| status | valor `specs` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/simulator/wizard/PersonalizationTabs.tsx`<br>`compara:src/types/domain/simulator-wizard.ts`<br>`escreve:src/types/domain/simulator-wizard.ts` |
| status | valor `comparison` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/simulator/wizard/PersonalizationTabs.tsx`<br>`compara:src/types/domain/simulator-wizard.ts`<br>`escreve:src/types/domain/simulator-wizard.ts` |
| status | valor `request` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:supabase/functions/step-up-verify/index.ts`<br>`escreve:src/hooks/useStepUpAuth.ts`<br>`escreve:supabase/functions/step-up-verify/index.ts` |
| status | valor `verify_password` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:supabase/functions/step-up-verify/index.ts`<br>`escreve:src/hooks/useStepUpAuth.ts`<br>`escreve:supabase/functions/step-up-verify/index.ts` |
| status | valor `verify_otp` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:supabase/functions/step-up-verify/index.ts`<br>`escreve:src/hooks/useStepUpAuth.ts`<br>`escreve:supabase/functions/step-up-verify/index.ts` |
| status | valor `cancel` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:supabase/functions/step-up-verify/index.ts`<br>`escreve:src/hooks/useStepUpAuth.ts` |
| status | valor `string` para `old_status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/orders/OrderAuditTimeline.tsx` |
| status | valor `string` para `new_status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/orders/OrderAuditTimeline.tsx` |
| status | valor `generating` para `stage` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/quotes/PdfGenerationDialog.tsx` |
| status | valor `Criados` para `stage` usado no código não existe em nenhum enum do banco/TS | `escreve:src/pages/quotes-dashboard/useQuotesDashboard.ts` |
| status | valor `Enviados` para `stage` usado no código não existe em nenhum enum do banco/TS | `escreve:src/pages/quotes-dashboard/useQuotesDashboard.ts` |
| status | valor `Respondidos` para `stage` usado no código não existe em nenhum enum do banco/TS | `escreve:src/pages/quotes-dashboard/useQuotesDashboard.ts` |
| status | valor `Aprovados` para `stage` usado no código não existe em nenhum enum do banco/TS | `escreve:src/pages/quotes-dashboard/useQuotesDashboard.ts` |
| status | valor `connection` para `stage` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/_shared/connection-test-runner.ts` |
| status | valor `met` para `sla_status` usado no código não existe em nenhum enum do banco/TS | `compara:supabase/functions/monthly-health-report/index.ts` |
| status | valor `ready` para `cloudflare_status` usado no código não existe em nenhum enum do banco/TS | `compara:src/lib/external-db/products-detail.ts` |
| status | valor `Aprovação` para `situacao` usado no código não existe em nenhum enum do banco/TS | `escreve:src/pages/sicoob/DemoPortalPage.tsx` |
| status | valor `Produção` para `situacao` usado no código não existe em nenhum enum do banco/TS | `escreve:src/pages/sicoob/DemoPortalPage.tsx` |
| status | valor `not_populated` para `materialized_view_status` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/external-db-bridge/index.ts` |
| coluna | coluna `count` usada no código não existe no schema de `profiles` |  |
| coluna | coluna `category_id` usada no código não existe no schema de `product_categories` |  |
| coluna | coluna `product_id` usada no código não existe no schema de `product_categories` |  |
| coluna | coluna `level` usada no código não existe no schema de `categories` |  |
| coluna | coluna `brand` usada no código não existe no schema de `products` |  |
| coluna | coluna `personalization_areas` usada no código não existe no schema de `products` |  |
| coluna | coluna `primary_image_url` usada no código não existe no schema de `products` |  |
| coluna | coluna `sale_price` usada no código não existe no schema de `products` |  |
| coluna | coluna `stock_quantity` usada no código não existe no schema de `products` |  |
| coluna | coluna `bitrix_company_id` usada no código não existe no schema de `companies` |  |
| coluna | coluna `deleted_at` usada no código não existe no schema de `companies` |  |
| coluna | coluna `is_customer` usada no código não existe no schema de `companies` |  |
| coluna | coluna `ramo_atividade` usada no código não existe no schema de `companies` |  |
| coluna | coluna `title` usada no código não existe no schema de `companies` |  |
| coluna | coluna `is_primary` usada no código não existe no schema de `contact_emails` |  |
| coluna | coluna `is_primary` usada no código não existe no schema de `contact_phones` |  |
| coluna | coluna `used_at` usada no código não existe no schema de `step_up_tokens` |  |
| tabela | tabela `a` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs` |
| tabela | tabela `categories_tree_visual` usada no código não existe nas migrations/types do repo | `supabase/functions/categories-api/index.ts` |
| tabela | tabela `contacts` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs`<br>`supabase/functions/crm-db-bridge/index.ts` |
| tabela | tabela `customers` usada no código não existe nas migrations/types do repo | `supabase/functions/expert-chat/index.ts` |
| tabela | tabela `dashboard_table` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `emails` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `fantasma` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs` |
| tabela | tabela `fixture_table` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `ghost_table` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `material_groups` usada no código não existe nas migrations/types do repo | `supabase/functions/materials-api/index.ts` |
| tabela | tabela `material_types` usada no código não existe nas migrations/types do repo | `supabase/functions/materials-api/index.ts` |
| tabela | tabela `mv_material_group_stats` usada no código não existe nas migrations/types do repo | `supabase/functions/materials-api/index.ts` |
| tabela | tabela `payments` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `product_category_assignments` usada no código não existe nas migrations/types do repo | `supabase/functions/categories-api/index.ts`<br>`supabase/functions/expert-chat/index.ts` |
| tabela | tabela `product_materials` usada no código não existe nas migrations/types do repo | `supabase/functions/materials-api/index.ts` |
| tabela | tabela `product_variants` usada no código não existe nas migrations/types do repo | `supabase/functions/sync-quote-bitrix/index.ts` |
| tabela | tabela `runtime_table` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `so_teste` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs` |
| tabela | tabela `t` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs` |
| tabela | tabela `t1` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs` |
| tabela | tabela `tabela` usada no código não existe nas migrations/types do repo | `scripts/check-seller-scope.mjs`<br>`scripts/inventario/gerar-banco.mjs`<br>`scripts/inventario/gerar-repo.mjs` |
| tabela | tabela `tabela_preco_gravacao_oficial` usada no código não existe nas migrations/types do repo | `supabase/functions/external-db-bridge/index.ts` |
| tabela | tabela `tabela_preco_gravacao_oficial_faixa` usada no código não existe nas migrations/types do repo | `supabase/functions/external-db-bridge/index.ts` |
| tabela | tabela `tools_runtime` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `tx` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs` |
| tabela | tabela `v_commemorative_dates_with_colors` usada no código não existe nas migrations/types do repo | `supabase/functions/commemorative-dates/index.ts` |
| rls | `admin_audit_log`: front faz INSERT mas nenhuma política RLS permite INSERT → vai falhar/retornar vazio para usuários | `src/hooks/useDiscountApproval.ts`<br>`src/lib/audit-logger.ts` |
| rls | `catalog_marketing_term_usage`: acessada do front (1 arquivo(s)) sem RLS (não encontrado) | `src/hooks/useCatalogMarketing.ts` |
| rls | `discount_approval_requests`: front faz UPDATE mas nenhuma política RLS permite UPDATE → vai falhar/retornar vazio para usuários | `src/components/admin/DiscountApprovalQueue.tsx` |
| rls | `scheduled_notifications`: front faz UPDATE mas nenhuma política RLS permite UPDATE → vai falhar/retornar vazio para usuários | `src/hooks/useNotificationOmnichannel.ts` |
| rls | `sicoob_centrais`: front faz INSERT mas nenhuma política RLS permite INSERT → vai falhar/retornar vazio para usuários | `src/pages/admin/AdminCentraisPage.tsx` |
| rls | `sicoob_centrais`: front faz UPDATE mas nenhuma política RLS permite UPDATE → vai falhar/retornar vazio para usuários | `src/pages/admin/AdminCentraisPage.tsx` |
| rls | `sicoob_centrais`: front faz DELETE mas nenhuma política RLS permite DELETE → vai falhar/retornar vazio para usuários | `src/pages/admin/AdminCentraisPage.tsx` |
| rls | `v_sicoob_hierarchy`: acessada do front (1 arquivo(s)) sem RLS (não encontrado) | `src/components/sicoob/HierarchyPath.tsx` |
| edge | edge function `dashboard-edge` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `fixture-edge` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `ghost-edge` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `inexistente` invocada mas não existe em supabase/functions/ | `scripts/ai-context/cenarios.mjs` |
| edge | edge function `orphan-fn` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `other` invocada mas não existe em supabase/functions/ | `scripts/ai-context/cenarios.mjs` |
| edge | edge function `runtime-fn` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `runtime-missing` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `send-email` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `tools-edge` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `usada` invocada mas não existe em supabase/functions/ | `tests/scripts/inventario-gerar-repo.test.ts` |
| rpc | RPC `dashboard_rpc` chamada mas não definida nas migrations/types | `scripts/ai-context/gerar.unit.mjs` |
| rpc | RPC `demo` chamada mas não definida nas migrations/types | `scripts/supabase_snapshot/test_snapshot.py` |
| rpc | RPC `fixture_rpc` chamada mas não definida nas migrations/types | `scripts/ai-context/gerar.unit.mjs` |
| rpc | RPC `fn` chamada mas não definida nas migrations/types | `scripts/supabase_snapshot/snapshot.py`<br>`supabase/functions/_shared/supabase-client-adapter.ts` |
| rpc | RPC `get_active_commemorative_dates` chamada mas não definida nas migrations/types | `supabase/functions/commemorative-dates/index.ts` |
| rpc | RPC `get_all_material_groups_safe` chamada mas não definida nas migrations/types | `supabase/functions/materials-api/index.ts` |
| rpc | RPC `get_all_material_types_safe` chamada mas não definida nas migrations/types | `supabase/functions/materials-api/index.ts` |
| rpc | RPC `get_category_descendants` chamada mas não definida nas migrations/types | `supabase/functions/external-db-bridge/index.ts` |
| rpc | RPC `get_material_types_by_group_slug` chamada mas não definida nas migrations/types | `supabase/functions/materials-api/index.ts` |
| rpc | RPC `get_materials_complete_safe` chamada mas não definida nas migrations/types | `supabase/functions/materials-api/index.ts` |
| rpc | RPC `get_upcoming_commemorative_dates` chamada mas não definida nas migrations/types | `supabase/functions/commemorative-dates/index.ts` |
| rpc | RPC `get_variants_for_commemorative_date` chamada mas não definida nas migrations/types | `supabase/functions/commemorative-dates/index.ts` |
| rpc | RPC `ghost_rpc` chamada mas não definida nas migrations/types | `scripts/ai-context/gerar.unit.mjs` |
| rpc | RPC `log_view` chamada mas não definida nas migrations/types | `tests/scripts/check-seller-scope.test.ts` |
| rpc | RPC `nome` chamada mas não definida nas migrations/types | `scripts/db/check-runtime-refs.mjs`<br>`scripts/supabase_snapshot/snapshot.py` |
| rpc | RPC `r1` chamada mas não definida nas migrations/types | `scripts/ai-context/cenarios.mjs` |
| rpc | RPC `runtime_rpc` chamada mas não definida nas migrations/types | `scripts/ai-context/gerar.unit.mjs` |
| rpc | RPC `tools_rpc` chamada mas não definida nas migrations/types | `scripts/ai-context/gerar.unit.mjs` |
| rpc | RPC `x` chamada mas não definida nas migrations/types | `tests/scripts/check-seller-scope.test.ts` |
| dinâmico | 2 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `scripts/check-seller-scope.mjs` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `scripts/inventario/gerar-banco.mjs` |
| dinâmico | 2 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `scripts/regras_negocio/generate.py` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `src/components/admin/connections/WebhooksTab.tsx` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `src/components/mockup/ArtFileUpload.tsx` |
| dinâmico | 5 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `src/hooks/useCommercialIntelligence.ts` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `src/hooks/common/useDuplicateEntity.ts` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `src/hooks/orders/extensions/useOrderPilotApprovals.ts` |
| dinâmico | 2 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `src/lib/storage-resilience.ts` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `src/pages/SystemStatusPage.tsx` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `src/services/OrderService.ts` |
| dinâmico | 6 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `supabase/functions/crm-db-bridge/index.ts` |
| dinâmico | 6 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `supabase/functions/e2e-cleanup/index.ts` |
| dinâmico | 14 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `supabase/functions/external-db-bridge/index.ts` |
| dinâmico | 2 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `supabase/functions/external-db-inspect/index.ts` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `supabase/functions/migration-health-check/index.ts` |
| dinâmico | 6 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `supabase/functions/rls-integration-tests/index.ts` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `supabase/functions/secure-upload/index.ts` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `supabase/functions/sicoob-artwork-register/index.ts` |
| dinâmico | 2 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `tests/scripts/check-seller-scope.test.ts` |
| segurança | função `audit_trigger_func` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20251227100004_audit_log_universal.sql` |
| segurança | função `get_record_history` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20251227100004_audit_log_universal.sql` |
| segurança | função `soft_delete_record` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20260102_20260102205635_add_soft_delete_support.sql` |
| segurança | função `restore_record` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20260102_20260102205635_add_soft_delete_support.sql` |
| segurança | função `permanent_delete_record` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20260102_20260102205635_add_soft_delete_support.sql` |
| segurança | função `get_quote_token_by_value` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20261008010000_fix_plpgsql_lint_failures.sql` |
| segurança | função `search_records_rerank` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20261008010000_fix_plpgsql_lint_failures.sql` |
| segurança | função `snapshot_hardening_status` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20261008010000_fix_plpgsql_lint_failures.sql` |
| segurança | função `auto_block_extreme_offenders` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20261008010000_fix_plpgsql_lint_failures.sql` |
| segurança | função `sync_external_connections_from_credentials` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20261008010000_fix_plpgsql_lint_failures.sql` |
| segurança | função `request_step_up_challenge` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20261008010000_fix_plpgsql_lint_failures.sql` |
| segurança | função `verify_step_up_otp` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20261008010000_fix_plpgsql_lint_failures.sql` |
| segurança | função `consume_step_up_token` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20261008010000_fix_plpgsql_lint_failures.sql` |
| segurança | função `auto_revoke_orphan_full_keys` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20261008010000_fix_plpgsql_lint_failures.sql` |
| segurança | função `validate_mcp_key` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20261008010000_fix_plpgsql_lint_failures.sql` |
| segurança | função `lookup_request_id` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20261008010000_fix_plpgsql_lint_failures.sql` |
| segurança | função `generate_sicoob_performance_report` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20261008010000_fix_plpgsql_lint_failures.sql` |
| segurança | função `fn_audit_order_status_change` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20260502175334_93cdfc03-97b2-4de9-9e60-5152452316b5.sql` |
| segurança | função `is_singular_buyer_for_quote` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20260503150940_278af794-cf56-48b3-a1c1-e8b3e9548a70.sql` |
| segurança | função `send_notification` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20260503151554_c98e739b-b86f-42f6-9afa-19f4c8243298.sql` |
| segurança | função `log_quote_status_change` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20260503152237_8abc882e-7fc0-4b9a-b3b0-bf7fc0f9c6ea.sql` |
| segurança | função `get_user_cooperative_id` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20260503160341_84e732be-f325-45ef-80a0-ec5d22b0326b.sql` |
| segurança | função `log_admin_action` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20260503175512_115f0a9c-0f07-4475-8cb2-753fe80adc2e.sql` |
| segurança | função `audit_sicoob_order_status_change` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20260503195511_9bfebfbb-30c5-44b0-b1b4-7fa3a00d6bdb.sql` |
| segurança | função `qa_preflight_check` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20261008010000_fix_plpgsql_lint_failures.sql` |
| segurança | função `fn_audit_config_change` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20260503210523_c20e48ce-121f-47b6-b504-857d41593aa1.sql` |
| segurança | função `check_security_health` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20261008010000_fix_plpgsql_lint_failures.sql` |
| segurança | função `provision_qa_accounts` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20260503213627_e07b8683-875e-4805-8129-f9ccc126e10d.sql` |
| segurança | função `seed_qa_scenario` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20260503213627_e07b8683-875e-4805-8129-f9ccc126e10d.sql` |
| segurança | função `get_query_telemetry_p95` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20261008010000_fix_plpgsql_lint_failures.sql` |
| segurança | função `notify_approval_status_change` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20260503220418_7d0d76d8-3b54-4554-aaea-6750ed654c77.sql` |
| segurança | função `log_quote_action` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20260509175720_8b74bfb2-932d-477a-a121-c2a7d4914abf.sql` |
| segurança | função `request_sicoob_order_approval` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20261008010000_fix_plpgsql_lint_failures.sql` |
| segurança | função `get_sicoob_consolidation_sellers` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20261008010000_fix_plpgsql_lint_failures.sql` |
| segurança | função `create_sicoob_kit_quote` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20261008010000_fix_plpgsql_lint_failures.sql` |
| segurança | função `sicoob_current_actor_approval_authority` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20261008010000_fix_plpgsql_lint_failures.sql` |
| segurança | função `reorder_sicoob_quote_as_quote` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20261008010000_fix_plpgsql_lint_failures.sql` |
| segurança | função `reorder_sicoob_order_as_quote_legacy_20260927` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20261008010000_fix_plpgsql_lint_failures.sql` |
| webhook | edge function `manage-users` processa eventos de webhook sem sinal de idempotência (evento duplicado = efeito duplicado) | `supabase/functions/manage-users/index.ts` |
| webhook | edge function `sicoob-approval-reconciliation` processa eventos de webhook sem sinal de idempotência (evento duplicado = efeito duplicado) | `supabase/functions/sicoob-approval-reconciliation/index.ts` |

## Lacunas — o que este contexto NÃO consegue responder (perguntas para o dono do negócio)

- Nenhuma regra manual em `manual/`: prazos, limites, exceções comerciais, quem aprova o quê — só o negócio sabe.
- `products.stock_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `quotes.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `bitrix_deals.stage` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `bitrix_sync_logs.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `product_sync_logs.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `quote_approval_tokens.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `sync_jobs.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `user_onboarding.current_step` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `companies.estado` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `companies.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `company_addresses.estado` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `simulator_wizard_drafts.wizard_step` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `seller_carts.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `magic_up_generations.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `city_whitelist.state` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `access_blocked_log.state` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `custom_kits.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `kit_share_tokens.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `ai_usage_logs.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `discount_approval_requests.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `magic_up_campaigns.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `magic_up_public_shares.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `optimization_queue.guardrail_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `optimization_queue_runs.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `optimization_queue_runs.guardrail_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `external_connections_sync_log.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `webhook_delivery_metrics.http_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `sicoob_orders.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `sicoob_order_history.previous_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `sicoob_order_history.new_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `sicoob_rls_audit_logs.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `order_invoices.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `order_payments.payment_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `order_logistics.delivery_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `logistics_tracking.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `order_consolidations.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `quote_consolidations.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `notifications.delivery_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `export_audit_log.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `pontos_atendimento.state` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `limit_increase_requests.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `qa_releases.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `qa_run_steps.step_name` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `notification_logs.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `admin_audit_log.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `admin_audit_log_default.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `admin_audit_log_y2024.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `admin_audit_log_y2025.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `admin_audit_log_y2026_m01.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `admin_audit_log_y2026_m02.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `admin_audit_log_y2026_m03.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `admin_audit_log_y2026_m04.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `admin_audit_log_y2026_m05.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `admin_audit_log_y2026_m06.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `admin_audit_log_y2026_m07.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `admin_audit_log_y2026_m08.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `admin_audit_log_y2026_m09.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `admin_audit_log_y2026_m10.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `admin_audit_log_y2026_m11.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `admin_audit_log_y2026_m12.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `admin_audit_log_y2027_m01.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `admin_audit_log_y2027_m02.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `admin_audit_log_y2027_m03.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- 276/291 tabelas sem `COMMENT ON TABLE` — o significado de negócio não está no schema: `notification_templates`, `webhook_configs`, `webhook_logs`, `push_subscriptions`, `entity_versions`, `categories`, `suppliers`, `products`, `quotes`, `profiles`, `user_roles`, `bitrix_clients` …
- Há tabelas usadas no código sem migration no repo — o schema real pode ter sido alterado pelo painel.

## Regras manuais presentes

_nenhuma — copie `manual/TEMPLATE-regras-de-negocio.md`_
