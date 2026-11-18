# Relacionamentos (chaves estrangeiras)


| de | colunas | para | colunas | on delete | on update |
|---|---|---|---|---|---|
| public.access_blocked_log | user_id | auth.users | id | NO ACTION | NO ACTION |
| public.access_security_settings | updated_by | auth.users | id | NO ACTION | NO ACTION |
| public.admin_config_audit | changed_by | auth.users | id | NO ACTION | NO ACTION |
| public.audit_log | user_id | auth.users | id | SET NULL | NO ACTION |
| public.bitrix_sync_logs | synced_by | auth.users | id | NO ACTION | NO ACTION |
| public.blog_posts | author_id | auth.users | id | NO ACTION | NO ACTION |
| public.cart_items | user_id | auth.users | id | CASCADE | NO ACTION |
| public.cart_templates | user_id | auth.users | id | CASCADE | NO ACTION |
| public.catalog_marketing_terms | created_by | auth.users | id | SET NULL | NO ACTION |
| public.catalog_marketing_terms | updated_by | auth.users | id | SET NULL | NO ACTION |
| public.catalog_product_marketing | created_by | auth.users | id | SET NULL | NO ACTION |
| public.catalog_product_marketing | term_id | public.catalog_marketing_terms | id | CASCADE | NO ACTION |
| public.city_whitelist | created_by | auth.users | id | NO ACTION | NO ACTION |
| public.collection_items | collection_id | public.collections | id | CASCADE | NO ACTION |
| public.comparison_reactions | comparison_id | public.user_comparisons | id | CASCADE | NO ACTION |
| public.connection_test_history | connection_id | public.external_connections | id | CASCADE | NO ACTION |
| public.cooperativa_budgets | cooperativa_id | public.cooperativas | id | CASCADE | NO ACTION |
| public.cooperativas | central_id | public.sicoob_centrais | id | NO ACTION | NO ACTION |
| public.cooperativas | sicoob_tema_id | public.sicoob_temas | id | NO ACTION | NO ACTION |
| public.device_login_notifications | device_id | public.user_known_devices | id | CASCADE | NO ACTION |
| public.discount_approval_requests | quote_id | public.quotes | id | CASCADE | NO ACTION |
| public.expert_conversations | seller_id | auth.users | id | CASCADE | NO ACTION |
| public.expert_messages | conversation_id | public.expert_conversations | id | CASCADE | NO ACTION |
| public.export_audit_log | job_id | public.export_jobs | id | NO ACTION | NO ACTION |
| public.export_audit_log | user_id | auth.users | id | NO ACTION | NO ACTION |
| public.export_jobs | user_id | auth.users | id | NO ACTION | NO ACTION |
| public.favorite_item_reactions | item_id | public.favorite_items | id | CASCADE | NO ACTION |
| public.favorite_item_reactions | list_id | public.favorite_lists | id | CASCADE | NO ACTION |
| public.favorite_items | list_id | public.favorite_lists | id | CASCADE | NO ACTION |
| public.follow_up_reminders | seller_id | auth.users | id | CASCADE | NO ACTION |
| public.inbound_webhook_events | endpoint_id | public.inbound_webhook_endpoints | id | CASCADE | NO ACTION |
| public.ip_whitelist | created_by | auth.users | id | NO ACTION | NO ACTION |
| public.kit_collaborators | kit_id | public.custom_kits | id | CASCADE | NO ACTION |
| public.kit_comments | kit_id | public.custom_kits | id | CASCADE | NO ACTION |
| public.kit_comments | parent_id | public.kit_comments | id | CASCADE | NO ACTION |
| public.kit_share_tokens | kit_id | public.custom_kits | id | CASCADE | NO ACTION |
| public.kit_variants | kit_master_id | public.custom_kits | id | CASCADE | NO ACTION |
| public.limit_increase_requests | approved_by | auth.users | id | NO ACTION | NO ACTION |
| public.limit_increase_requests | pa_id | public.postos_atendimento | id | NO ACTION | NO ACTION |
| public.limit_increase_requests | requested_by | auth.users | id | NO ACTION | NO ACTION |
| public.magic_up_comments | generation_id | public.magic_up_generations | id | CASCADE | NO ACTION |
| public.magic_up_generations | campaign_id | public.magic_up_campaigns | id | SET NULL | NO ACTION |
| public.magic_up_generations | user_id | auth.users | id | CASCADE | NO ACTION |
| public.magic_up_public_shares | campaign_id | public.magic_up_campaigns | id | CASCADE | NO ACTION |
| public.magic_up_public_shares | generation_id | public.magic_up_generations | id | CASCADE | NO ACTION |
| public.magic_up_reactions | generation_id | public.magic_up_generations | id | CASCADE | NO ACTION |
| public.manager_notification_config | user_id | auth.users | id | CASCADE | NO ACTION |
| public.mcp_api_keys | rotated_from | public.mcp_api_keys | id | SET NULL | NO ACTION |
| public.mcp_key_auto_revocations | key_id | public.mcp_api_keys | id | CASCADE | NO ACTION |
| public.mockup_drafts | user_id | auth.users | id | CASCADE | NO ACTION |
| public.mockup_prompt_history | config_id | public.mockup_prompt_configs | id | CASCADE | NO ACTION |
| public.notification_digests | user_id | auth.users | id | CASCADE | NO ACTION |
| public.notification_logs | user_id | auth.users | id | CASCADE | NO ACTION |
| public.notification_preferences | user_id | auth.users | id | CASCADE | NO ACTION |
| public.notifications | user_id | auth.users | id | CASCADE | NO ACTION |
| public.optimization_queue_runs | queue_id | public.optimization_queue | id | CASCADE | NO ACTION |
| public.order_approval_history | approver_id | auth.users | id | NO ACTION | NO ACTION |
| public.order_approval_history | order_id | public.orders | id | CASCADE | NO ACTION |
| public.order_audit_events | actor_id | auth.users | id | NO ACTION | NO ACTION |
| public.order_audit_events | order_id | public.orders | id | CASCADE | NO ACTION |
| public.order_comments | author_id | auth.users | id | NO ACTION | NO ACTION |
| public.order_comments | order_id | public.orders | id | CASCADE | NO ACTION |
| public.order_comments | parent_id | public.order_comments | id | CASCADE | NO ACTION |
| public.order_consolidation_orders | consolidation_id | public.order_consolidations | id | RESTRICT | NO ACTION |
| public.order_consolidation_orders | order_id | public.sicoob_orders | id | RESTRICT | NO ACTION |
| public.order_consolidations | consolidated_by | auth.users | id | NO ACTION | NO ACTION |
| public.order_consolidations | singular_id | public.cooperativas | id | RESTRICT | NO ACTION |
| public.order_consolidations | vendedor_id | auth.users | id | RESTRICT | NO ACTION |
| public.order_duplicate_requests | actor_id | auth.users | id | CASCADE | NO ACTION |
| public.order_duplicate_requests | duplicated_order_id | public.orders | id | CASCADE | NO ACTION |
| public.order_duplicate_requests | source_order_id | public.orders | id | CASCADE | NO ACTION |
| public.order_invoices | created_by | auth.users | id | NO ACTION | NO ACTION |
| public.order_invoices | order_id | public.orders | id | CASCADE | NO ACTION |
| public.order_items | order_id | public.orders | id | CASCADE | NO ACTION |
| public.order_items | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.order_logistics | order_id | public.orders | id | CASCADE | NO ACTION |
| public.order_logistics_tracking | created_by | auth.users | id | NO ACTION | NO ACTION |
| public.order_logistics_tracking | order_id | public.orders | id | CASCADE | NO ACTION |
| public.order_payments | created_by | auth.users | id | NO ACTION | NO ACTION |
| public.order_payments | invoice_id | public.order_invoices | id | SET NULL | NO ACTION |
| public.order_payments | order_id | public.orders | id | CASCADE | NO ACTION |
| public.order_pilot_approvals | created_by | auth.users | id | NO ACTION | NO ACTION |
| public.order_pilot_approvals | order_id | public.orders | id | CASCADE | NO ACTION |
| public.order_pilot_approvals | parent_approval_id | public.order_pilot_approvals | id | SET NULL | NO ACTION |
| public.order_template_items | template_id | public.order_templates | id | CASCADE | NO ACTION |
| public.order_templates | source_order_id | public.orders | id | SET NULL | NO ACTION |
| public.order_templates | user_id | auth.users | id | CASCADE | NO ACTION |
| public.orders | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.orders | quote_id | public.quotes | id | NO ACTION | NO ACTION |
| public.organization_members | organization_id | public.organizations | id | CASCADE | NO ACTION |
| public.organization_members | user_id | auth.users | id | CASCADE | NO ACTION |
| public.ownership_repair_logs | report_id | public.ownership_audit_reports | id | SET NULL | NO ACTION |
| public.pa_budgets | pa_id | public.postos_atendimento | id | CASCADE | NO ACTION |
| public.pa_category_thresholds | pa_id | public.postos_atendimento | id | CASCADE | NO ACTION |
| public.pa_notification_settings | pa_id | public.postos_atendimento | id | CASCADE | NO ACTION |
| public.pa_singularidades | central_id | public.sicoob_centrais | id | NO ACTION | NO ACTION |
| public.password_reset_requests | reviewed_by | auth.users | id | SET NULL | NO ACTION |
| public.password_reset_requests | user_id | auth.users | id | SET NULL | NO ACTION |
| public.personalization_simulations | seller_id | auth.users | id | CASCADE | NO ACTION |
| public.pontos_atendimento | singular_id | public.pa_singularidades | id | NO ACTION | NO ACTION |
| public.postos_atendimento | cooperativa_id | public.cooperativas | id | RESTRICT | NO ACTION |
| public.postos_atendimento | responsavel_user_id | auth.users | id | SET NULL | NO ACTION |
| public.product_categories | parent_id | public.product_categories | id | CASCADE | NO ACTION |
| public.product_component_location_techniques | component_location_id | public.product_component_locations | id | CASCADE | NO ACTION |
| public.product_component_locations | component_id | public.product_components | id | CASCADE | NO ACTION |
| public.product_group_components | product_group_id | public.product_groups | id | CASCADE | NO ACTION |
| public.product_group_location_techniques | group_location_id | public.product_group_locations | id | CASCADE | NO ACTION |
| public.product_group_locations | group_component_id | public.product_group_components | id | CASCADE | NO ACTION |
| public.product_group_members | product_group_id | public.product_groups | id | CASCADE | NO ACTION |
| public.product_price_freshness_overrides | updated_by | auth.users | id | SET NULL | NO ACTION |
| public.profiles | cooperativa_id | public.cooperativas | id | SET NULL | NO ACTION |
| public.profiles | pa_id | public.postos_atendimento | id | SET NULL | NO ACTION |
| public.profiles | user_id | auth.users | id | CASCADE | NO ACTION |
| public.qa_release_evidences | release_id | public.qa_releases | id | CASCADE | NO ACTION |
| public.qa_release_evidences | uploaded_by | auth.users | id | NO ACTION | NO ACTION |
| public.qa_releases | approved_by | auth.users | id | NO ACTION | NO ACTION |
| public.qa_run_steps | run_id | public.qa_runs | id | CASCADE | NO ACTION |
| public.qa_runs | executed_by | auth.users | id | NO ACTION | NO ACTION |
| public.quote_approval_tokens | seller_id | auth.users | id | CASCADE | NO ACTION |
| public.quote_approval_tokens | signature_key_id | public.quote_approval_evidence_keys | id | NO ACTION | NO ACTION |
| public.quote_audit_logs | quote_id | public.quotes | id | CASCADE | NO ACTION |
| public.quote_audit_logs | user_id | auth.users | id | NO ACTION | NO ACTION |
| public.quote_comments | parent_id | public.quote_comments | id | CASCADE | NO ACTION |
| public.quote_consolidations | consolidated_by | auth.users | id | NO ACTION | NO ACTION |
| public.quote_consolidations | singular_id | public.cooperativas | id | NO ACTION | NO ACTION |
| public.quote_history | quote_id | public.quotes | id | CASCADE | NO ACTION |
| public.quote_item_personalizations | quote_item_id | public.quote_items | id | CASCADE | NO ACTION |
| public.quote_items | quote_id | public.quotes | id | CASCADE | NO ACTION |
| public.quote_save_idempotency | actor_id | auth.users | id | CASCADE | NO ACTION |
| public.quote_save_idempotency | quote_id | public.quotes | id | CASCADE | NO ACTION |
| public.quote_templates | created_by | auth.users | id | NO ACTION | NO ACTION |
| public.quotes | approved_by | auth.users | id | NO ACTION | NO ACTION |
| public.quotes | consolidation_id | public.quote_consolidations | id | NO ACTION | NO ACTION |
| public.quotes | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.quotes | pa_id | public.postos_atendimento | id | NO ACTION | NO ACTION |
| public.quotes | parent_quote_id | public.quotes | id | SET NULL | NO ACTION |
| public.quotes | reorder_source_order_id | public.sicoob_orders | id | RESTRICT | NO ACTION |
| public.quotes | reorder_source_quote_id | public.quotes | id | RESTRICT | NO ACTION |
| public.quotes | singular_id | public.cooperativas | id | NO ACTION | NO ACTION |
| public.role_migration_items | batch_id | public.role_migration_batches | id | CASCADE | NO ACTION |
| public.saved_filters | user_id | auth.users | id | CASCADE | NO ACTION |
| public.scheduled_exports | user_id | auth.users | id | NO ACTION | NO ACTION |
| public.scheduled_notifications | user_id | auth.users | id | CASCADE | NO ACTION |
| public.seller_cart_items | cart_id | public.seller_carts | id | CASCADE | NO ACTION |
| public.seller_carts | seller_id | auth.users | id | CASCADE | NO ACTION |
| public.seller_discount_limits | user_id | auth.users | id | CASCADE | NO ACTION |
| public.sensitive_access_logs | user_id | auth.users | id | NO ACTION | NO ACTION |
| public.sicoob_approval_delegations | cooperative_id | public.cooperativas | id | NO ACTION | NO ACTION |
| public.sicoob_approval_delegations | delegate_id | auth.users | id | NO ACTION | NO ACTION |
| public.sicoob_approval_delegations | delegator_id | auth.users | id | NO ACTION | NO ACTION |
| public.sicoob_approval_delegations | pa_id | public.postos_atendimento | id | NO ACTION | NO ACTION |
| public.sicoob_approval_delegations | revoked_by | auth.users | id | NO ACTION | NO ACTION |
| public.sicoob_approval_deliveries | request_id | public.sicoob_approval_requests | id | CASCADE | NO ACTION |
| public.sicoob_approval_deliveries | setting_id | public.pa_notification_settings | id | SET NULL | NO ACTION |
| public.sicoob_approval_deliveries | supersedes_delivery_id | public.sicoob_approval_deliveries | id | SET NULL | NO ACTION |
| public.sicoob_approval_policies | cooperative_id | public.cooperativas | id | CASCADE | NO ACTION |
| public.sicoob_approval_requests | approval_delegation_id | public.sicoob_approval_delegations | id | NO ACTION | NO ACTION |
| public.sicoob_approval_requests | approver_id | auth.users | id | NO ACTION | NO ACTION |
| public.sicoob_approval_requests | authority_delegator_id | auth.users | id | NO ACTION | NO ACTION |
| public.sicoob_approval_requests | order_id | public.sicoob_orders | id | CASCADE | NO ACTION |
| public.sicoob_approval_requests | requester_id | auth.users | id | NO ACTION | NO ACTION |
| public.sicoob_delivery_allocations | destination_id | public.sicoob_delivery_destinations | id | RESTRICT | NO ACTION |
| public.sicoob_delivery_allocations | order_item_id | public.sicoob_order_items | id | RESTRICT | NO ACTION |
| public.sicoob_delivery_destinations | consolidation_id | public.order_consolidations | id | RESTRICT | NO ACTION |
| public.sicoob_delivery_destinations | pa_id | public.postos_atendimento | id | RESTRICT | NO ACTION |
| public.sicoob_delivery_receipt_events | allocation_id | public.sicoob_delivery_allocations | id | RESTRICT | NO ACTION |
| public.sicoob_delivery_receipt_events | received_by | auth.users | id | NO ACTION | NO ACTION |
| public.sicoob_document_registry | order_id | public.sicoob_orders | id | RESTRICT | NO ACTION |
| public.sicoob_document_registry | uploaded_by | auth.users | id | NO ACTION | NO ACTION |
| public.sicoob_invitation_events | actor_id | auth.users | id | RESTRICT | NO ACTION |
| public.sicoob_invitation_events | cooperative_id | public.cooperativas | id | RESTRICT | NO ACTION |
| public.sicoob_invitation_events | invitation_id | public.sicoob_invitations | id | RESTRICT | NO ACTION |
| public.sicoob_invitation_events | target_user_id | auth.users | id | RESTRICT | NO ACTION |
| public.sicoob_invitations | accepted_by | auth.users | id | RESTRICT | NO ACTION |
| public.sicoob_invitations | access_revoked_by | auth.users | id | RESTRICT | NO ACTION |
| public.sicoob_invitations | cooperative_id | public.cooperativas | id | RESTRICT | NO ACTION |
| public.sicoob_invitations | invited_by | auth.users | id | RESTRICT | NO ACTION |
| public.sicoob_invitations | pa_id | public.postos_atendimento | id | RESTRICT | NO ACTION |
| public.sicoob_invitations | revoked_by | auth.users | id | RESTRICT | NO ACTION |
| public.sicoob_invitations | superseded_by | public.sicoob_invitations | id | SET NULL | NO ACTION |
| public.sicoob_kit_quote_requests | quote_id | public.quotes | id | RESTRICT | NO ACTION |
| public.sicoob_manager_audit | manager_id | auth.users | id | NO ACTION | NO ACTION |
| public.sicoob_order_artwork_versions | created_by | auth.users | id | NO ACTION | NO ACTION |
| public.sicoob_order_artwork_versions | decided_by | auth.users | id | NO ACTION | NO ACTION |
| public.sicoob_order_artwork_versions | order_id | public.sicoob_orders | id | RESTRICT | NO ACTION |
| public.sicoob_order_history | order_id | public.sicoob_orders | id | CASCADE | NO ACTION |
| public.sicoob_order_history | user_id | auth.users | id | NO ACTION | NO ACTION |
| public.sicoob_order_invoices | created_by | auth.users | id | NO ACTION | NO ACTION |
| public.sicoob_order_invoices | document_id | public.sicoob_document_registry | id | RESTRICT | NO ACTION |
| public.sicoob_order_invoices | order_id | public.sicoob_orders | id | RESTRICT | NO ACTION |
| public.sicoob_order_item_logs | order_id | public.sicoob_orders | id | CASCADE | NO ACTION |
| public.sicoob_order_item_logs | user_id | auth.users | id | NO ACTION | NO ACTION |
| public.sicoob_order_items | order_id | public.sicoob_orders | id | CASCADE | NO ACTION |
| public.sicoob_order_payments | created_by | auth.users | id | NO ACTION | NO ACTION |
| public.sicoob_order_payments | invoice_id | public.sicoob_order_invoices | id | SET NULL | NO ACTION |
| public.sicoob_order_payments | order_id | public.sicoob_orders | id | RESTRICT | NO ACTION |
| public.sicoob_order_payments | refunded_by | auth.users | id | NO ACTION | NO ACTION |
| public.sicoob_order_payments | updated_by | auth.users | id | NO ACTION | NO ACTION |
| public.sicoob_order_shipments | created_by | auth.users | id | NO ACTION | NO ACTION |
| public.sicoob_order_shipments | delivery_document_id | public.sicoob_document_registry | id | RESTRICT | NO ACTION |
| public.sicoob_order_shipments | delivery_photo_uploaded_by | auth.users | id | NO ACTION | NO ACTION |
| public.sicoob_order_shipments | order_id | public.sicoob_orders | id | RESTRICT | NO ACTION |
| public.sicoob_orders | approved_by | auth.users | id | NO ACTION | NO ACTION |
| public.sicoob_orders | consolidation_id | public.order_consolidations | id | RESTRICT | NO ACTION |
| public.sicoob_orders | cooperative_id | public.cooperativas | id | CASCADE | NO ACTION |
| public.sicoob_orders | created_by | auth.users | id | NO ACTION | NO ACTION |
| public.sicoob_orders | pa_id | public.postos_atendimento | id | CASCADE | NO ACTION |
| public.sicoob_orders | source_quote_id | public.quotes | id | RESTRICT | NO ACTION |
| public.sicoob_quote_reorder_requests | quote_id | public.quotes | id | RESTRICT | NO ACTION |
| public.sicoob_quote_reorder_requests | source_quote_id | public.quotes | id | RESTRICT | NO ACTION |
| public.sicoob_reorder_requests | quote_id | public.quotes | id | RESTRICT | NO ACTION |
| public.sicoob_reorder_requests | source_order_id | public.sicoob_orders | id | RESTRICT | NO ACTION |
| public.step_up_tokens | challenge_id | public.step_up_challenges | id | CASCADE | NO ACTION |
| public.telemetry_events | user_id | auth.users | id | NO ACTION | NO ACTION |
| public.telemetry_logs | user_id | auth.users | id | NO ACTION | NO ACTION |
| public.user_onboarding | user_id | auth.users | id | CASCADE | NO ACTION |
| public.user_roles | user_id | auth.users | id | CASCADE | NO ACTION |
| public.webhook_configs | user_id | auth.users | id | CASCADE | NO ACTION |
| public.webhook_deliveries | webhook_id | public.outbound_webhooks | id | CASCADE | NO ACTION |
| public.webhook_logs | webhook_id | public.webhook_configs | id | CASCADE | NO ACTION |
| public.webhook_retry_claims | webhook_id | public.outbound_webhooks | id | CASCADE | NO ACTION |


_Diagrama omitido: mais de 120 tabelas._
