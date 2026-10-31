-- Corrige avisos mecânicos e seguros do advisor de performance:
-- 1) cobre todas as FKs sem índice; 2) remove apenas índices comprovadamente
-- idênticos, preservando o nome canônico mais descritivo de cada par.

CREATE INDEX IF NOT EXISTS idx_bitrix_sync_logs_synced_by
  ON public.bitrix_sync_logs (synced_by);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_reviewed_by
  ON public.password_reset_requests (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_user_id
  ON public.password_reset_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_quote_approval_tokens_signature_key_id
  ON public.quote_approval_tokens (signature_key_id);
CREATE INDEX IF NOT EXISTS idx_quote_save_idempotency_quote_id
  ON public.quote_save_idempotency (quote_id);
CREATE INDEX IF NOT EXISTS idx_sicoob_approval_delegations_pa_id
  ON public.sicoob_approval_delegations (pa_id);
CREATE INDEX IF NOT EXISTS idx_sicoob_approval_delegations_revoked_by
  ON public.sicoob_approval_delegations (revoked_by);
CREATE INDEX IF NOT EXISTS idx_sicoob_approval_deliveries_supersedes_delivery
  ON public.sicoob_approval_deliveries (supersedes_delivery_id);
CREATE INDEX IF NOT EXISTS idx_sicoob_approval_requests_delegation
  ON public.sicoob_approval_requests (approval_delegation_id);
CREATE INDEX IF NOT EXISTS idx_sicoob_approval_requests_delegator
  ON public.sicoob_approval_requests (authority_delegator_id);
CREATE INDEX IF NOT EXISTS idx_sicoob_document_registry_order_id
  ON public.sicoob_document_registry (order_id);
CREATE INDEX IF NOT EXISTS idx_sicoob_document_registry_uploaded_by
  ON public.sicoob_document_registry (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_sicoob_invitations_access_revoked_by
  ON public.sicoob_invitations (access_revoked_by);
CREATE INDEX IF NOT EXISTS idx_sicoob_invitations_revoked_by
  ON public.sicoob_invitations (revoked_by);
CREATE INDEX IF NOT EXISTS idx_sicoob_invitations_superseded_by
  ON public.sicoob_invitations (superseded_by);
CREATE INDEX IF NOT EXISTS idx_sicoob_shipments_photo_uploaded_by
  ON public.sicoob_order_shipments (delivery_photo_uploaded_by);
CREATE INDEX IF NOT EXISTS idx_sicoob_reorder_requests_quote_id
  ON public.sicoob_quote_reorder_requests (quote_id);

DROP INDEX IF EXISTS public.idx_admin_audit_log_y2026_m05_created_at;
DROP INDEX IF EXISTS public.idx_admin_audit_log_y2026_m06_created_at;
DROP INDEX IF EXISTS public.idx_invoices_order;
DROP INDEX IF EXISTS public.idx_profiles_cooperativa;
DROP INDEX IF EXISTS public.idx_profiles_pa;
DROP INDEX IF EXISTS public.idx_personalizations_item;
DROP INDEX IF EXISTS public.idx_fk_sicoob_delivery_allocations_order_item_id_fkey;
DROP INDEX IF EXISTS public.idx_fk_sicoob_delivery_destinations_pa_id_fkey;
DROP INDEX IF EXISTS public.idx_fk_sicoob_delivery_receipt_events_received_by_fkey;

DO $migration$
DECLARE
  v_expected_indexes text[] := ARRAY[
    'public.idx_bitrix_sync_logs_synced_by',
    'public.idx_password_reset_requests_reviewed_by',
    'public.idx_password_reset_requests_user_id',
    'public.idx_quote_approval_tokens_signature_key_id',
    'public.idx_quote_save_idempotency_quote_id',
    'public.idx_sicoob_approval_delegations_pa_id',
    'public.idx_sicoob_approval_delegations_revoked_by',
    'public.idx_sicoob_approval_deliveries_supersedes_delivery',
    'public.idx_sicoob_approval_requests_delegation',
    'public.idx_sicoob_approval_requests_delegator',
    'public.idx_sicoob_document_registry_order_id',
    'public.idx_sicoob_document_registry_uploaded_by',
    'public.idx_sicoob_invitations_access_revoked_by',
    'public.idx_sicoob_invitations_revoked_by',
    'public.idx_sicoob_invitations_superseded_by',
    'public.idx_sicoob_shipments_photo_uploaded_by',
    'public.idx_sicoob_reorder_requests_quote_id'
  ];
  v_index text;
BEGIN
  FOREACH v_index IN ARRAY v_expected_indexes LOOP
    IF to_regclass(v_index) IS NULL THEN
      RAISE EXCEPTION 'Índice esperado ausente: %', v_index;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM unnest(ARRAY[
      'public.idx_admin_audit_log_y2026_m05_created_at',
      'public.idx_admin_audit_log_y2026_m06_created_at',
      'public.idx_invoices_order',
      'public.idx_profiles_cooperativa',
      'public.idx_profiles_pa',
      'public.idx_personalizations_item',
      'public.idx_fk_sicoob_delivery_allocations_order_item_id_fkey',
      'public.idx_fk_sicoob_delivery_destinations_pa_id_fkey',
      'public.idx_fk_sicoob_delivery_receipt_events_received_by_fkey'
    ]::text[]) AS obsolete(index_name)
    WHERE to_regclass(obsolete.index_name) IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Índice duplicado obsoleto permaneceu após a consolidação';
  END IF;
END
$migration$;
