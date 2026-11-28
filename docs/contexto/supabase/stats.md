# Métricas (voláteis — mudam sem alteração de schema)

Valores aproximados de propósito, para não gerar commits a cada coleta. Fora de `snapshot.json`; o bruto está em `stats.json`.

## Banco

| métrica | valor |
|---|---|
| tamanho | 236.6 MB |
| schema public | 154.4 MB |
| schema private | 24.0 KB |


## Tabelas (ordenadas por tamanho)

| tabela | linhas (~) | total | heap | índices | linhas mortas (~) | seq scans (~) | idx scans (~) | último autovacuum |
|---|---|---|---|---|---|---|---|---|
| public.telemetry_events | ~98.5k | 47.8 MB | 42.7 MB | 5.0 MB | ~10 | 3 | ~640 | 2026-10-30 |
| public.query_telemetry | ~63.7k | 43.7 MB | 9.2 MB | 17.1 MB | 3 | ~20 | ~78.8k | 2026-10-30 |
| public.admin_audit_log_y2026_m10 | ~20.3k | 17.9 MB | 9.1 MB | 8.8 MB | ~20 | 5 | ~21.2k | 2026-10-28 |
| public.sicoob_approval_worker_dispatches | ~41.7k | 15.9 MB | 10.2 MB | 5.6 MB | ~7.1k | ~64.6k | ~219.5k | 2026-11-25 |
| public.e2e_cleanup_audit | ~10.5k | 6.6 MB | 3.6 MB | 3.0 MB | 7 | 0 | 6 | 2026-10-30 |
| public.workspace_notifications | ~9.4k | 5.9 MB | 4.3 MB | 1.6 MB | 7 | 0 | ~82.2k | 2026-10-18 |
| public.login_attempts | ~7.7k | 3.1 MB | 2.1 MB | 984.0 KB | 0 | ~900 | ~6.5k | 2026-10-18 |
| public.mcp_access_violations | ~2k | 1016.0 KB | 496.0 KB | 480.0 KB | ~180 | ~10 | ~4.2k | 2026-10-27 |
| public.admin_audit_log_y2026_m09 | ~180 | 504.0 KB | 256.0 KB | 208.0 KB | 0 | ~360 | ~9.5k |  |
| public.quotes | 0 | 320.0 KB | 8.0 KB | 288.0 KB | ~10 | ~1.3k | ~45.6k | 2026-11-07 |
| public.connection_test_history | ~400 | 264.0 KB | 72.0 KB | 152.0 KB | ~40 | ~6k | ~13k | 2026-11-28 |
| public.sicoob_invitations | 0 | 184.0 KB | 8.0 KB | 168.0 KB | 0 | ~30 | ~130 |  |
| public.sicoob_orders | 0 | 184.0 KB | 8.0 KB | 152.0 KB | 7 | ~1.1k | ~5.7k | 2026-10-16 |
| public.orders | 0 | 160.0 KB | 8.0 KB | 144.0 KB | 0 | 6 | ~12.2k |  |
| public.request_rate_limits | 1 | 160.0 KB | 16.0 KB | 104.0 KB | ~40 | ~1.2k | ~7.7k | 2026-11-01 |
| public.admin_audit_log_default | 0 | 152.0 KB | 8.0 KB | 136.0 KB | 0 | ~190 | ~10.9k |  |
| public.admin_audit_log_y2026_m05 | 0 | 152.0 KB | 8.0 KB | 136.0 KB | 0 | ~360 | ~160 |  |
| public.admin_audit_log_y2026_m08 | 0 | 152.0 KB | 8.0 KB | 136.0 KB | 0 | ~360 | ~160 |  |
| public.profiles | ~10 | 144.0 KB | 24.0 KB | 80.0 KB | ~20 | ~41.7M | ~632.7k | 2026-10-28 |
| public.admin_audit_log_y2026_m11 | 0 | 136.0 KB | 8.0 KB | 120.0 KB | 3 | ~190 | ~10.9k |  |
| public.bot_detection_log | ~20 | 128.0 KB | 24.0 KB | 64.0 KB | ~20 | ~370 | ~1.9k | 2026-11-13 |
| public.search_analytics | 0 | 128.0 KB | 8.0 KB | 112.0 KB | 3 | ~20 | ~810 |  |
| public.e2e_cleanup_rate_limit | ~390 | 112.0 KB | 32.0 KB | 40.0 KB | ~30 | ~220 | ~12.8k | 2026-10-29 |
| public.product_views | ~60 | 112.0 KB | 16.0 KB | 64.0 KB | 0 | ~800 | ~1.5k |  |
| public.sicoob_approval_requests | 0 | 112.0 KB | 8.0 KB | 96.0 KB | 5 | ~40 | ~63k |  |
| public.admin_config_audit | ~70 | 104.0 KB | 40.0 KB | 32.0 KB | ~40 | ~20 | ~30 |  |
| public.external_connections | 2 | 104.0 KB | 8.0 KB | 88.0 KB | ~20 | ~17.7k | ~100 |  |
| public.cooperativas | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 2 | ~220 | ~640 |  |
| public.favorite_items | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 6 | ~4k | ~10.1k |  |
| public.favorite_lists | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 9 | 7 | ~38.4k |  |
| public.order_consolidations | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 0 | ~10 | ~70 |  |
| public.pa_budget_entries | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 0 | ~20 | ~30 |  |
| public.pa_budgets | 6 | 96.0 KB | 8.0 KB | 80.0 KB | ~50 | ~60 | ~290 |  |
| public.password_reset_requests | 1 | 96.0 KB | 8.0 KB | 80.0 KB | 0 | ~3.3k | 0 |  |
| public.sicoob_invitation_events | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 0 | 7 | ~70 |  |
| public.inbound_webhook_endpoints | 0 | 88.0 KB | 24.0 KB | 32.0 KB | ~20 | ~10 | ~120 |  |
| public.user_roles | ~10 | 88.0 KB | 8.0 KB | 48.0 KB | ~30 | ~52.1M | ~6.9M | 2026-10-14 |
| public.admin_audit_log_y2024 | 0 | 80.0 KB | 0 B | 72.0 KB | 0 | ~360 | ~210 |  |
| public.admin_audit_log_y2025 | 0 | 80.0 KB | 0 B | 72.0 KB | 0 | ~360 | ~210 |  |
| public.admin_audit_log_y2026_m01 | 0 | 80.0 KB | 0 B | 72.0 KB | 0 | ~360 | ~160 |  |
| public.admin_audit_log_y2026_m02 | 0 | 80.0 KB | 0 B | 72.0 KB | 0 | ~360 | ~160 |  |
| public.admin_audit_log_y2026_m03 | 0 | 80.0 KB | 0 B | 72.0 KB | 0 | ~360 | ~160 |  |
| public.admin_audit_log_y2026_m04 | 0 | 80.0 KB | 0 B | 72.0 KB | 0 | ~360 | ~160 |  |
| public.admin_audit_log_y2026_m06 | 0 | 80.0 KB | 0 B | 72.0 KB | 0 | ~360 | ~160 |  |
| public.admin_audit_log_y2026_m07 | 0 | 80.0 KB | 0 B | 72.0 KB | 0 | ~360 | ~160 |  |
| public.admin_audit_log_y2026_m12 | 0 | 80.0 KB | 0 B | 72.0 KB | 0 | ~190 | ~10.9k |  |
| public.admin_audit_log_y2027_m01 | 0 | 80.0 KB | 0 B | 72.0 KB | 0 | ~190 | ~10.9k |  |
| public.admin_audit_log_y2027_m02 | 0 | 80.0 KB | 0 B | 72.0 KB | 0 | ~190 | ~10.9k |  |
| public.admin_audit_log_y2027_m03 | 0 | 80.0 KB | 0 B | 72.0 KB | 0 | ~190 | ~10.9k |  |
| public.catalog_marketing_terms | ~30 | 80.0 KB | 8.0 KB | 64.0 KB | 0 | ~40 | ~8k |  |
| public.order_audit_events | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 0 | 5 | ~30 |  |
| public.postos_atendimento | 0 | 80.0 KB | 8.0 KB | 64.0 KB | ~10 | ~370 | ~1.4k |  |
| public.sicoob_delivery_destinations | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 0 | 5 | 0 |  |
| public.sicoob_delivery_receipt_events | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 0 | 7 | ~30 |  |
| public.sicoob_order_history | 0 | 80.0 KB | 8.0 KB | 64.0 KB | ~20 | 5 | ~100 |  |
| public.sicoob_order_items | 0 | 80.0 KB | 16.0 KB | 32.0 KB | ~30 | 8 | ~30 |  |
| public.product_component_location_techniques | 0 | 72.0 KB | 8.0 KB | 56.0 KB | 0 | 5 | 0 |  |
| public.product_group_location_techniques | 0 | 72.0 KB | 8.0 KB | 56.0 KB | 0 | 5 | 0 |  |
| public.sicoob_delivery_allocations | 0 | 72.0 KB | 8.0 KB | 64.0 KB | 0 | 5 | 0 |  |
| public.sicoob_order_payments | 0 | 72.0 KB | 0 B | 64.0 KB | 0 | ~1.2k | ~100 |  |
| public.sicoob_order_shipments | 0 | 72.0 KB | 0 B | 64.0 KB | 0 | 8 | ~80 |  |
| public.bitrix_deals | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~10 | 1 |  |
| public.cooperativa_budgets | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 5 | ~10 | 7 |  |
| public.discount_approval_requests | 0 | 64.0 KB | 0 B | 56.0 KB | 0 | ~700 | ~32.4k |  |
| public.external_connections_sync_log | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 5 | ~180 |  |
| public.integration_credentials | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~10 | ~1.2M |  |
| public.notification_preferences | ~10 | 64.0 KB | 8.0 KB | 16.0 KB | 6 | ~10 | ~60 | 2026-10-16 |
| public.order_items | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~3.2k | ~100 |  |
| public.product_component_locations | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 5 | 0 |  |
| public.product_group_components | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 5 | 0 |  |
| public.product_group_locations | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 5 | 0 |  |
| public.quote_approval_evidence_keys | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~10 | 2 |  |
| public.quote_approval_tokens | 0 | 64.0 KB | 0 B | 56.0 KB | 0 | ~820 | ~840 |  |
| public.quote_history | 0 | 64.0 KB | 8.0 KB | 48.0 KB | ~10 | ~620 | ~70 |  |
| public.sicoob_approval_deliveries | 0 | 64.0 KB | 0 B | 56.0 KB | 0 | ~100k | ~287.3k |  |
| public.sicoob_approval_policies | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 7 | ~170 |  |
| public.sicoob_order_artwork_versions | 0 | 64.0 KB | 0 B | 56.0 KB | 0 | 5 | ~80 |  |
| public.step_up_audit_log | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 7 | 0 |  |
| public.bitrix_sync_logs | 0 | 56.0 KB | 8.0 KB | 40.0 KB | 0 | ~10 | ~30 |  |
| public.magic_up_generations | 0 | 56.0 KB | 0 B | 48.0 KB | 0 | 5 | ~870 |  |
| public.mcp_api_keys | 0 | 56.0 KB | 8.0 KB | 40.0 KB | 5 | ~2.2k | 5 |  |
| public.notifications | 0 | 56.0 KB | 0 B | 48.0 KB | 0 | 9 | ~860 |  |
| public.order_consolidation_orders | 0 | 56.0 KB | 8.0 KB | 48.0 KB | 0 | 5 | 0 |  |
| public.order_duplicate_requests | 0 | 56.0 KB | 8.0 KB | 48.0 KB | 0 | 8 | ~30 |  |
| public.order_invoices | 0 | 56.0 KB | 0 B | 48.0 KB | 0 | 5 | ~30 |  |
| public.sicoob_approval_delegations | 0 | 56.0 KB | 0 B | 48.0 KB | 0 | ~50 | ~60 |  |
| public.sicoob_order_invoices | 0 | 56.0 KB | 0 B | 48.0 KB | 0 | 6 | ~40 |  |
| public.ai_usage_logs | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~10 | ~1.5k |  |
| public.bitrix_clients | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~10 | 0 |  |
| public.collections | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | 5 | ~75.3k |  |
| public.custom_kits | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~1.9k | ~6.8k |  |
| public.favorite_item_reactions | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | 5 | 0 |  |
| public.magic_up_public_shares | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | 8 | 0 |  |
| public.mockup_drafts | 5 | 48.0 KB | 8.0 KB | 32.0 KB | ~10 | ~600 | ~380 |  |
| public.newsletter_subscribers | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 1 | 5 | 0 |  |
| public.order_comments | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | 5 | ~30 |  |
| public.order_payments | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | 6 | ~30 |  |
| public.order_pilot_approvals | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | 5 | ~30 |  |
| public.ownership_audit_reports | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 5 | 1 |  |
| public.personalization_simulations | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 5 | ~30 |  |
| public.product_group_members | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 5 | 0 |  |
| public.qa_runs | 2 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~40 | 0 |  |
| public.quote_comments | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | 6 | ~160 |  |
| public.quote_items | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 4 | ~10.5k | ~210 |  |
| public.quote_save_idempotency | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 3 | ~20 | ~50 |  |
| public.sales_goals | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 5 | 0 |  |
| public.seller_cart_items | 0 | 48.0 KB | 8.0 KB | 32.0 KB | ~40 | ~16k | ~270 |  |
| public.seller_carts | 2 | 48.0 KB | 8.0 KB | 32.0 KB | ~40 | ~39.1k | ~39.6k |  |
| public.sicoob_centrais | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~20 | 2 |  |
| public.sicoob_document_registry | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~10 | ~30 |  |
| public.sicoob_manager_audit | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 5 | ~30 |  |
| public.step_up_tokens | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~4.9k | 0 |  |
| public.user_comparisons | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~820 | ~850 |  |
| public.user_onboarding | 0 | 48.0 KB | 8.0 KB | 32.0 KB | ~20 | 5 | ~69.3k |  |
| public.webhook_delivery_metrics | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | 7 | ~10.5k |  |
| public.access_blocked_log | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 7 | ~30 |  |
| public.access_security_settings | 1 | 40.0 KB | 8.0 KB | 32.0 KB | 0 | ~3.3k | 0 |  |
| public.ai_usage_quotas | 0 | 40.0 KB | 8.0 KB | 32.0 KB | 0 | 9 | ~1.1k |  |
| public.art_file_attachments | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 7 | 0 |  |
| public.audit_log | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 7 | ~30 |  |
| public.city_whitelist | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~600 | ~30 |  |
| public.collection_item_reactions | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 5 | 0 |  |
| public.collection_items | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~1.2k | 0 |  |
| public.collection_items_trash | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 5 | ~50 |  |
| public.follow_up_reminders | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 9 | ~30 |  |
| public.ip_access_control | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~60 | ~7.1k |  |
| public.ip_whitelist | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~610 | ~720 |  |
| public.kit_collaborators | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 5 | 0 |  |
| public.limit_increase_requests | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 6 | ~70 |  |
| public.mockup_prompt_configs | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 5 | ~310 |  |
| public.order_logistics_tracking | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~10 | ~30 |  |
| public.order_templates | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 5 | ~30 |  |
| public.product_categories | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 5 | 1 |  |
| public.product_price_freshness_overrides | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~320 | ~110 |  |
| public.push_subscriptions | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~10 | 0 |  |
| public.rls_denial_log | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 5 | ~310 |  |
| public.role_migration_items | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 5 | 0 |  |
| public.sicoob_order_item_logs | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 5 | ~40 |  |
| public.sicoob_quote_reorder_requests | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 9 | ~20 |  |
| public.sicoob_reorder_requests | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 8 | 8 |  |
| public.ai_insights_cache | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 7 | ~1.1k |  |
| public.ai_usage_events | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 7 | ~370 |  |
| public.blog_posts | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~10 | ~30 |  |
| public.catalog_product_marketing | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | ~79.9k |  |
| public.cms_banners | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~3.5k | 0 |  |
| public.comparison_reactions | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 5 | 0 |  |
| public.cost_centers | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~10 | 1 |  |
| public.export_audit_log | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 8 | ~30 |  |
| public.export_jobs | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 5 | ~68.1k |  |
| public.favorite_items_trash | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 5 | ~4.2k |  |
| public.file_scan_logs | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 5 | 0 |  |
| public.kit_comments | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 5 | 0 |  |
| public.kit_share_tokens | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~800 | 0 |  |
| public.kit_templates | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 5 | ~790 |  |
| public.magic_up_brand_kits | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 5 | 0 |  |
| public.magic_up_reactions | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 8 | 0 |  |
| public.mcp_key_auto_revocations | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 5 | 2 |  |
| public.mockup_templates | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 9 | 0 |  |
| public.order_approval_history | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 5 | ~30 |  |
| public.organization_members | 0 | 32.0 KB | 0 B | 32.0 KB | 0 | 8 | ~69k |  |
| public.outbound_webhooks | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~12.3k | 0 |  |
| public.ownership_repair_logs | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 5 | 0 |  |
| public.pa_budget_allocations | 0 | 32.0 KB | 0 B | 32.0 KB | 0 | ~10 | 1 |  |
| public.pa_singularidades | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 6 | 0 |  |
| public.pontos_atendimento | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~10 | 0 |  |
| public.product_components | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 5 | 0 |  |
| public.product_groups | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 5 | 0 |  |
| public.product_sync_logs | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 5 | ~7.9k |  |
| public.public_token_failures | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~60 | 0 |  |
| public.qa_release_evidences | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 5 | ~30 |  |
| public.qa_releases | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 5 | ~30 |  |
| public.qa_rls_audits | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 7 | 0 |  |
| public.quote_audit_logs | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~10 | ~40 |  |
| public.quote_consolidations | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 8 | ~30 |  |
| public.quote_templates | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~3.3k | ~30 |  |
| public.role_migration_batches | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 5 | 0 |  |
| public.scheduled_notifications | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 9 | ~30 |  |
| public.secret_rotation_log | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~2.8k | ~4.5k |  |
| public.seller_discount_limits | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 5 | ~1.4k |  |
| public.sicoob_kit_quote_requests | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 9 | 8 |  |
| public.sicoob_temas | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~20 | 0 |  |
| public.step_up_challenges | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~4.9k | 0 |  |
| public.telemetry_logs | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 8 | ~30 |  |
| public.webhook_deliveries | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~1.9k | ~1.9k |  |
| public.webhook_retry_claims | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~10 | ~10 |  |
| private.quote_price_attestations | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 2 | 0 |  |
| public.admin_settings | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 7 | ~3.6k |  |
| public.cart_items | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 7 | ~30 |  |
| public.cart_templates | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 7 | ~7k |  |
| public.cooperativas_parceiras | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 6 | 0 |  |
| public.coupons | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 5 | 0 |  |
| public.device_login_notifications | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 5 | 0 |  |
| public.expert_conversations | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 5 | ~57.8k |  |
| public.expert_messages | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 5 | 0 |  |
| public.hardening_health_snapshots | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 5 | 1 |  |
| public.inbound_webhook_events | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 9 | ~50 |  |
| public.kit_variants | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 5 | 0 |  |
| public.magic_up_campaigns | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 5 | ~840 |  |
| public.magic_up_comments | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 8 | 0 |  |
| public.manager_notification_config | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | ~30 |  |
| public.mockup_prompt_history | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 5 | 0 |  |
| public.notification_channels | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | 0 |  |
| public.notification_digests | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 9 | ~30 |  |
| public.notification_logs | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 9 | ~30 |  |
| public.notification_templates | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 8 | 0 |  |
| public.optimization_queue | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~3k | 0 |  |
| public.optimization_queue_runs | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | 0 |  |
| public.order_logistics | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 5 | 0 |  |
| public.order_template_items | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 5 | 0 |  |
| public.organizations | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 9 | 0 |  |
| public.pa_category_thresholds | 0 | 24.0 KB | 0 B | 24.0 KB | 0 | 5 | 0 |  |
| public.pa_notification_settings | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 5 | 0 |  |
| public.permissions | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~320 | 0 |  |
| public.price_history | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 5 | 0 |  |
| public.qa_run_steps | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 5 | 0 |  |
| public.quote_item_personalizations | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 5 | 8 |  |
| public.role_permissions | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~61.6k | ~1.9k |  |
| public.saved_filters | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~50 | ~4.6k |  |
| public.saved_trends_views | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 5 | ~830 |  |
| public.scheduled_exports | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~67.6k | ~550 |  |
| public.scheduled_reports | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~1.3k | ~140 |  |
| public.sensitive_access_logs | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 9 | ~30 |  |
| public.sicoob_approval_delivery_archive | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 7 | 0 |  |
| public.singulares | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 5 | 0 |  |
| public.user_known_devices | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 5 | ~1.7k |  |
| public.user_preferences | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 5 | 0 |  |
| public.video_variant_links | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~250 | 0 |  |
| public.voice_command_logs | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 5 | 0 |  |
| public.webhook_configs | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 9 | ~30 |  |
| public.webhook_logs | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | 0 |  |
| public.campaigns | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 7 | 0 |  |
| public.category_icons | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~7.3k | 0 |  |
| public.cms_config | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 5 | 0 |  |
| public.cms_sections | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~3.5k | 0 |  |
| public.component_media | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 6 | 0 |  |
| public.generated_mockups | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~8.6k | 0 |  |
| public.mcp_full_grantors | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 5 | 0 |  |
| public.portfolio_items | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 9 | 0 |  |
| public.sicoob_performance_reports | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 8 | 0 |  |
| public.sicoob_rls_audit_logs | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 5 | 0 |  |
| public.simulator_wizard_drafts | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~900 | 0 |  |
| public.system_settings | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 5 | ~1.9k |  |
| public.test_suites_runs | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 7 | 0 |  |
| public._backup_custom_kits_pinned_20261118 | 0 | 8.0 KB | 0 B | 8.0 KB | 0 | 7 | 0 |  |
| public.admin_audit_log | 0 | 0 B | 0 B | 0 B | 0 | 0 | 0 |  |


## Índices nunca usados (candidatos a remoção; ignore PK/UNIQUE)

| índice | tabela | tamanho |
|---|---|---|
| admin_audit_log_y2026_m10_request_id_idx | public.admin_audit_log_y2026_m10 | 1.5 MB |
| admin_audit_log_y2026_m10_source_created_at_idx | public.admin_audit_log_y2026_m10 | 1.5 MB |
| admin_audit_log_y2026_m10_status_created_at_idx | public.admin_audit_log_y2026_m10 | 1.1 MB |
| idx_e2e_cleanup_audit_email | public.e2e_cleanup_audit | 864.0 KB |
| idx_e2e_cleanup_audit_seller_id | public.e2e_cleanup_audit | 408.0 KB |
| idx_e2e_cleanup_audit_status | public.e2e_cleanup_audit | 736.0 KB |
| idx_query_telemetry_error_kind_created | public.query_telemetry | 1.1 MB |


## Storage

_nenhum_


## Auth (agregados)

| métrica | valor |
|---|---|
| usuários (~) | ~10 |
| confirmados (~) | ~10 |
| criados últimos 30d (~) | 0 |

| provider | usuários (~) |
|---|---|
| email | ~10 |


## Consultas mais custosas (pg_stat_statements, desde o último reset)
| role | chamadas (~) | total ms (~) | média ms | query |
|---|---|---|---|---|
| postgres | ~36.8k | ~27.9M | 758.21 | `SELECT public.monitor_sicoob_approval_worker()` |
| postgres | ~69k | ~6.3M | 91.30 | `SELECT public.dispatch_sicoob_approval_worker()` |
| postgres | ~73.7k | ~5.3M | 72.04 | `SELECT public.dispatch_sicoob_export_worker()` |
| authenticated | ~105.4k | ~4.3M | 40.79 | `WITH pgrst_source AS (UPDATE "public"."profiles" SET "last_login_at" = "pgrst_body"."last_login_at" FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "last_login_at" FROM json_to_record(pgrst_payload.json_data` |
| authenticated | ~2.6k | ~3.8M | 1444.75 | `WITH pgrst_source AS ( SELECT "public"."query_telemetry"."id" FROM "public"."query_telemetry" WHERE "public"."query_telemetry"."created_at" >= $1 LIMIT $2 OFFSET $3 ) , pgrst_source_count AS (SELECT $5 FROM "public"."que` |
| postgres | ~710 | ~2.7M | 3833.39 | `SELECT jobid, runid, status, start_time, end_time, EXTRACT($2 FROM (end_time - start_time))::numeric(10,2) AS seconds, left(return_message, $3) AS return_message FROM (SELECT *, row_number() OVER (PARTITION BY jobid ORDE` |
| authenticated | ~2.7k | ~2.6M | 972.64 | `WITH pgrst_source AS ( SELECT "public"."query_telemetry"."id" FROM "public"."query_telemetry" WHERE "public"."query_telemetry"."cache_hit" = $1 AND "public"."query_telemetry"."created_at" >= $2 LIMIT $3 OFFSET $4 ) , pgr` |
| service_role | ~62.8k | ~2.4M | 37.71 | `WITH pgrst_source AS (SELECT "pgrst_call".* FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "p_request_id" FROM json_to_record(pgrst_payload.json_data) AS _("p_request_id" uuid) LIMIT $4) pgrst_body , LATERA` |
| authenticated | ~6.6k | ~2.1M | 323.78 | `WITH pgrst_source AS ( SELECT "public"."query_telemetry".* FROM "public"."query_telemetry" WHERE "public"."query_telemetry"."severity" = $1 AND "public"."query_telemetry"."created_at" >= $2 LIMIT $3 OFFSET $4 ) , pgrst_s` |
| authenticated | ~62.5k | ~1.7M | 27.95 | `WITH pgrst_source AS ( SELECT "public"."workspace_notifications".* FROM "public"."workspace_notifications" WHERE "public"."workspace_notifications"."user_id" = $1 ORDER BY "public"."workspace_notifications"."created_at" ` |
| service_role | ~2k | ~1.7M | 820.66 | `WITH pgrst_source AS (SELECT pgrst_call.pgrst_scalar FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "_user_id", "_reason", "_source", "_operation", "_target_key_id", "_ip", "_user_agent", "_request_id", "_d` |
| authenticated | ~2.5k | ~1.5M | 607.74 | `WITH pgrst_source AS ( SELECT "public"."query_telemetry"."duration_ms", "public"."query_telemetry"."severity", "public"."query_telemetry"."record_count", "public"."query_telemetry"."created_at", "public"."query_telemetry` |
| authenticated | ~116.4k | ~1.4M | 12.20 | `WITH pgrst_source AS (SELECT "pgrst_call".* FROM "public"."get_sicoob_access_state"() pgrst_call) SELECT $3::bigint AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, coalesce(json_agg(_postgrest_t), $4) ` |
| authenticated | ~73.4k | ~1.3M | 18.36 | `WITH pgrst_source AS (INSERT INTO "public"."telemetry_events"("event_type", "metadata", "severity", "url", "user_agent") SELECT "pgrst_body"."event_type", "pgrst_body"."metadata", "pgrst_body"."severity", "pgrst_body"."u` |
| authenticator | ~1.1k | ~1.3M | 1144.63 | `SELECT name FROM pg_timezone_names` |


## Conexões
| usuário | estado | n |
|---|---|---|
| authenticator | idle | 5 |
| pgbouncer | idle | 1 |
| postgres | active | 1 |
| postgres | idle | 1 |
| supabase_admin | idle | 2 |
| supabase_admin |  | 1 |
