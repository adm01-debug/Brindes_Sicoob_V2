# Tipos customizados (enums, domains, composites)

| tipo | kind | valores / definição | usado em |
|---|---|---|---|
| public.app_role | enum | admin, manager, vendedor, supervisor, dev, gestor_compras, gerente_pa, comprador_pac, comprador_singular | public.ai_usage_quotas.role, public.role_migration_items.from_role, public.role_migration_items.to_role, public.role_permissions.role, public.sicoob_invitations.role, public.user_roles.role |
| public.order_status | enum | rascunho, enviado_gestor, aprovado_gestor, enviado_vendedor, em_producao, em_separacao, em_transporte, entregue, concluido, cancelado |  |
| public.org_role | enum | owner, admin, member | public.organization_members.role |
| public.quote_status | enum | draft, pending, sent, approved, rejected, expired, pending_approval, pending_singular_approval, approved_singular, rejected_singular, revision, viewed, converted |  |
| public.role_migration_item_status | enum | pending, success, failed, skipped, dry_run | public.role_migration_items.status |
| public.role_migration_status | enum | pending, running, completed, failed, partial, dry_run | public.role_migration_batches.status |
| public.step_up_action | enum | promote_dev, demote_dev, mcp_full_issue, mcp_full_escalate, secret_rotation, secret_revoke, mcp_key_revoke, mcp_key_rotate | public.step_up_audit_log.action, public.step_up_challenges.action, public.step_up_tokens.action, public.v_full_scope_grants.step_up_action |
