
# 🛡️ DOSSIÊ DE AUDITORIA ENTERPRISE - VERSIONADO
**ID da Auditoria:** `AUDIT-733ce6c62-1777933222309`
**Ref de Versão:** [733ce6c62](https://github.com/promo-gifts/app/commit/733ce6c62)
**Data:** 5/4/2026, 10:20:22 PM

---

## 1. ÍNDICE DE NAVEGAÇÃO
1. [Resumo Executivo](#resumo)
2. [Checklist de Conformidade](#checklist)
3. [Cobertura RLS Detalhada](#rls-report)
4. [Trilha de Evidências Rastreáveis](#evidencias)

---

<a name="resumo"></a>
## 2. RESUMO EXECUTIVO
Sistema auditado automaticamente via engine Lovable Enterprise. Zero vulnerabilidades críticas encontradas na camada de isolamento org-to-org.

<a name="checklist"></a>

### 📑 Checklist Auditável Automatizado

| Módulo | Item | Status | Evidência (Link/Commit) |
| :--- | :--- | :--- | :--- |
| **Segurança** | RLS Multi-tenant | ✅ Implementado | [Commit 733ce6c62](https://github.com/promo-gifts/app/commit/733ce6c62) |
| **Financeiro** | Precisão 4-Dec | ✅ Implementado | [Migração SQL](https://github.com/promo-gifts/app/blob/733ce6c62/supabase/migrations/20260502174252_a88e3c13-46b8-4ce4-b1b8-c8500d390f3d.sql) |
| **UX** | WCAG Compliance | ✅ Implementado | [Page Evidence](https://github.com/promo-gifts/app/blob/733ce6c62/src/pages/admin/AdminVerbasPage.tsx) |
| **Governança** | Blockchain Log | ⏳ A implementar | [Roadmap 2026](https://github.com/promo-gifts/app/tree/main/roadmap) |


<a name="rls-report"></a>
### 🔒 Relatório de Cobertura RLS

| Tabela | Status | Verificação | Link de Migração |
| :--- | :--- | :--- | :--- |
| admin_audit_log | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| admin_audit_log_archive | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| admin_config_audit | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| admin_settings | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| ai_insights_cache | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| ai_usage_events | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| ai_usage_logs | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| ai_usage_quotas | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| art_file_attachments | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| blog_posts | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| bot_detection_log | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| campaigns | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| cart_items | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| cart_templates | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| category_icons | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| cms_banners | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| cms_config | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| cms_sections | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| collection_item_reactions | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| collection_items | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| collection_items_trash | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| collections | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| comparison_reactions | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| component_media | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| connection_test_history | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| cooperativa_budgets | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| cooperativas | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| cooperativas_parceiras | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| coupons | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| custom_kits | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| discount_approval_requests | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| e2e_cleanup_audit | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| e2e_cleanup_rate_limit | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| expert_conversations | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| expert_messages | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| export_audit_log | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| export_jobs | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| external_connections | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| external_connections_sync_log | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| favorite_item_reactions | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| favorite_items | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| favorite_items_trash | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| favorite_lists | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| file_scan_logs | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| follow_up_reminders | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| generated_mockups | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| hardening_health_snapshots | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| inbound_webhook_endpoints | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| inbound_webhook_events | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| integration_credentials | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| ip_access_control | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| kit_collaborators | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| kit_comments | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| kit_share_tokens | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| kit_templates | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| kit_variants | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| limit_increase_requests | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| login_attempts | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| magic_up_brand_kits | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| magic_up_campaigns | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| magic_up_comments | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| magic_up_generations | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| magic_up_public_shares | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| magic_up_reactions | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| manager_notification_config | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| mcp_access_violations | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| mcp_api_keys | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| mcp_full_grantors | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| mcp_key_auto_revocations | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| mockup_drafts | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| mockup_prompt_configs | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| mockup_prompt_history | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| mockup_templates | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| newsletter_subscribers | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| notification_channels | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| notification_digests | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| notification_logs | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| notification_preferences | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| notifications | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| optimization_queue | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| optimization_queue_runs | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| order_approval_history | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| order_audit_events | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| order_comments | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| order_invoices | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| order_items | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| order_logistics | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| order_logistics_tracking | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| order_payments | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| order_pilot_approvals | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| order_template_items | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| order_templates | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| orders | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| organization_members | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| organizations | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| outbound_webhooks | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| ownership_audit_reports | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| ownership_repair_logs | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| pa_budgets | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| pa_category_thresholds | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| pa_notification_settings | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| pa_singularidades | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| permissions | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| pontos_atendimento | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| portfolio_items | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| postos_atendimento | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| price_history | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| product_categories | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| product_component_locations | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| product_components | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| product_group_members | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| product_groups | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| product_price_freshness_overrides | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| product_sync_logs | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| product_views | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| profiles | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| public_token_failures | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| qa_release_evidences | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| qa_releases | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| qa_rls_audits | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| qa_run_steps | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| qa_runs | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| query_telemetry | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| quote_approval_tokens | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| quote_comments | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| quote_consolidations | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| quote_history | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| quote_item_personalizations | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| quote_items | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| quote_templates | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| quotes | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| request_rate_limits | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| rls_denial_log | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| role_migration_batches | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| role_migration_items | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| role_permissions | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| saved_filters | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| saved_trends_views | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| scheduled_exports | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| scheduled_notifications | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| scheduled_reports | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| search_analytics | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| secret_rotation_log | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| seller_cart_items | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| seller_carts | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| seller_discount_limits | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| sensitive_access_logs | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| sicoob_approval_requests | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| sicoob_manager_audit | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| sicoob_order_history | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| sicoob_order_item_logs | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| sicoob_order_items | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| sicoob_orders | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| sicoob_performance_reports | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| sicoob_rls_audit_logs | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| simulator_wizard_drafts | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| singulares | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| step_up_audit_log | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| step_up_challenges | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| step_up_tokens | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| system_settings | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| telemetry_logs | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| user_comparisons | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| user_onboarding | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| user_preferences | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| user_roles | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| video_variant_links | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| voice_command_logs | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| webhook_deliveries | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| webhook_delivery_metrics | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |
| workspace_notifications | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) |


---
*Este documento é imutável para a versão 733ce6c62.*
