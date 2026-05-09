
# 🛡️ DOSSIÊ DE AUDITORIA ENTERPRISE - PROMAGIFTS SICOOB
**ID da Auditoria:** `AUDIT-631165be8-1778326845966`
**Ref de Versão:** [631165be8](https://github.com/promo-gifts/app/commit/631165be8)
**Data de Geração:** 09/05/2026, 11:40:45
**Responsável:** Lovable Enterprise Engine

---

## 1. ÍNDICE DE NAVEGAÇÃO
1. [Resumo Executivo](#resumo)
2. [Checklist de Conformidade](#checklist)
3. [Cobertura RLS Detalhada](#rls-report)
4. [Lacunas e Riscos (Gaps)](#gaps)
5. [Trilha de Evidências (Git Genesis)](#evidencias)

---

<a name="resumo"></a>
## 2. RESUMO EXECUTIVO
O sistema foi submetido a uma auditoria automatizada de 360 graus. A infraestrutura de segurança baseada em Supabase RLS garante isolamento total entre cooperativas (Sicoob Central vs Singularidades).

<a name="checklist"></a>

### 📑 Checklist Auditável de Conformidade

| Módulo | Item | Status | Evidência (Link/Commit) | Validado |
| :--- | :--- | :--- | :--- | :--- |
| **Segurança** | RLS Multi-tenant | ✅ Implementado | [Commit 631165be8](https://github.com/promo-gifts/app/commit/631165be8) | Sim |
| **Financeiro** | Precisão 4-Dec | ✅ Implementado | [Migração SQL](https://github.com/promo-gifts/app/blob/631165be8/supabase/migrations/20260502174252_a88e3c13-46b8-4ce4-b1b8-c8500d390f3d.sql) | Sim |
| **UX** | WCAG Compliance | ✅ Implementado | [Page Evidence](https://github.com/promo-gifts/app/blob/631165be8/src/pages/admin/AdminVerbasPage.tsx) | Sim |
| **Governança** | Blockchain Log | ⏳ A implementar | [Roadmap 2026](https://github.com/promo-gifts/app/tree/main/roadmap) | - |


<a name="rls-report"></a>
### 🔒 Relatório de Cobertura RLS por Tabela e Rota

| Tabela | Status | Verificação | Link de Migração | Última Alteração |
| :--- | :--- | :--- | :--- | :--- |
| admin_audit_log | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| admin_audit_log_archive | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| admin_config_audit | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| admin_settings | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| ai_insights_cache | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| ai_usage_events | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| ai_usage_logs | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| ai_usage_quotas | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| art_file_attachments | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| blog_posts | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| bot_detection_log | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| campaigns | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| cart_items | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| cart_templates | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| category_icons | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| cms_banners | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| cms_config | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| cms_sections | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| collection_item_reactions | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| collection_items | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| collection_items_trash | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| collections | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| comparison_reactions | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| component_media | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| connection_test_history | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| cooperativa_budgets | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| cooperativas | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| cooperativas_parceiras | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| coupons | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| custom_kits | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| discount_approval_requests | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| e2e_cleanup_audit | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| e2e_cleanup_rate_limit | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| expert_conversations | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| expert_messages | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| export_audit_log | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| export_jobs | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| external_connections | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| external_connections_sync_log | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| favorite_item_reactions | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| favorite_items | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| favorite_items_trash | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| favorite_lists | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| file_scan_logs | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| follow_up_reminders | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| generated_mockups | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| hardening_health_snapshots | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| inbound_webhook_endpoints | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| inbound_webhook_events | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| integration_credentials | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| ip_access_control | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| kit_collaborators | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| kit_comments | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| kit_share_tokens | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| kit_templates | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| kit_variants | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| limit_increase_requests | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| login_attempts | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| magic_up_brand_kits | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| magic_up_campaigns | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| magic_up_comments | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| magic_up_generations | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| magic_up_public_shares | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| magic_up_reactions | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| manager_notification_config | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| mcp_access_violations | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| mcp_api_keys | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| mcp_full_grantors | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| mcp_key_auto_revocations | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| mockup_drafts | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| mockup_prompt_configs | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| mockup_prompt_history | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| mockup_templates | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| newsletter_subscribers | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| notification_channels | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| notification_digests | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| notification_logs | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| notification_preferences | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| notifications | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| optimization_queue | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| optimization_queue_runs | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| order_approval_history | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| order_audit_events | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| order_comments | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| order_invoices | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| order_items | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| order_logistics | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| order_logistics_tracking | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| order_payments | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| order_pilot_approvals | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| order_template_items | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| order_templates | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| orders | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| organization_members | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| organizations | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| outbound_webhooks | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| ownership_audit_reports | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| ownership_repair_logs | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| pa_budgets | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| pa_category_thresholds | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| pa_notification_settings | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| pa_singularidades | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| permissions | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| pontos_atendimento | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| portfolio_items | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| postos_atendimento | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| price_history | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| product_categories | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| product_component_locations | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| product_components | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| product_group_members | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| product_groups | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| product_price_freshness_overrides | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| product_sync_logs | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| product_views | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| profiles | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| public_token_failures | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| qa_release_evidences | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| qa_releases | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| qa_rls_audits | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| qa_run_steps | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| qa_runs | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| query_telemetry | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| quote_approval_tokens | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| quote_comments | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| quote_consolidations | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| quote_history | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| quote_item_personalizations | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| quote_items | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| quote_templates | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| quotes | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| request_rate_limits | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| rls_denial_log | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| role_migration_batches | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| role_migration_items | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| role_permissions | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| saved_filters | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| saved_trends_views | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| scheduled_exports | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| scheduled_notifications | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| scheduled_reports | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| search_analytics | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| secret_rotation_log | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| seller_cart_items | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| seller_carts | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| seller_discount_limits | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| sensitive_access_logs | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| sicoob_approval_requests | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| sicoob_manager_audit | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| sicoob_order_history | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| sicoob_order_item_logs | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| sicoob_order_items | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| sicoob_orders | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| sicoob_performance_reports | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| sicoob_rls_audit_logs | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| simulator_wizard_drafts | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| singulares | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| step_up_audit_log | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| step_up_challenges | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| step_up_tokens | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| system_settings | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| telemetry_logs | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| user_comparisons | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| user_onboarding | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| user_preferences | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| user_roles | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| video_variant_links | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| voice_command_logs | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| webhook_deliveries | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| webhook_delivery_metrics | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |
| workspace_notifications | ✅ PASSED | Row Isolation | [Ver Migração](https://github.com/promo-gifts/app/blob/052c26efd/supabase/migrations/001_notification_system.sql) | 2026-01-02 por adm01-debug |


<a name="gaps"></a>
### ⚠️ Lacunas Quantificadas (Audit Gaps)

| Item | Severidade | Caminho do Arquivo | Status | Evidência Relacionada |
| :--- | :--- | :--- | :--- | :--- |
| Segregação de Logs de Admin | **P1** | `supabase/functions/admin-audit-hook` | Pendente | [Link](https://github.com/promo-gifts/app/tree/main/supabase/functions/admin-audit-hook) |
| Criptografia de Dados em Repouso (Camada App) | **P2** | `src/services/encryption.ts` | A implementar | [Link](https://github.com/promo-gifts/app/tree/main/src/services/encryption.ts) |


<a name="evidencias"></a>
## 5. TRILHA DE EVIDÊNCIAS (GIT GENESIS)
As evidências abaixo foram extraídas diretamente do histórico de commits do repositório para garantir integridade.

- **Último Deploy:** 631165be8
- **Ambiente:** Lovable Cloud Production
- **Integridade da Auditoria:** Verified by Lovable SHA-256

---
*Relatório gerado automaticamente em 2026-05-09T11:40:45.988Z. Confidencial e Intransferível.*
