-- As roles anon/authenticated recebem EXECUTE por default privilege neste
-- projeto, REVOKE FROM PUBLIC isolado não protege funções recém-criadas.
-- Restringe todo o pacote Sicoob auditado e reabre apenas o contrato chamado
-- diretamente pelo frontend autenticado. Edge Functions usam service_role.

DO $acl$
DECLARE
  target regprocedure;
BEGIN
  FOR target IN
    SELECT p.oid::regprocedure
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = ANY (ARRAY[
         'add_sicoob_order_invoice',
         'allocate_sicoob_consolidation_by_order_pa',
         'approve_sicoob_order',
         'assert_sicoob_approval_actor',
         'capture_sicoob_order_approval_policy',
         'confirm_sicoob_order',
         'create_sicoob_kit_quote',
         'create_sicoob_order_artwork_version',
         'create_sicoob_order_consolidation',
         'decide_sicoob_order_artwork',
         'dispatch_sicoob_order_consolidation',
         'freeze_sicoob_order_while_approval_pending',
         'get_sicoob_consolidation_sellers',
         'get_sicoob_kit_quote_idempotency',
         'get_sicoob_order_approval_policy',
         'get_sicoob_order_shipment',
         'get_sicoob_reorder_idempotency',
         'guard_sicoob_approval_request_insert',
         'guard_sicoob_approval_status_transition',
         'prepare_sicoob_order_confirmation',
         'protect_sicoob_approval_policy_version',
         'protect_sicoob_approval_request',
         'protect_sicoob_consolidation_records',
         'protect_sicoob_order_artwork_version',
         'protect_sicoob_order_consolidation_link',
         'protect_sicoob_order_payment',
         'record_sicoob_delivery_receipt',
         'record_sicoob_order_payment',
         'record_sicoob_order_status_event',
         'refund_sicoob_order_payment',
         'reject_sicoob_order',
         'reject_sicoob_order_without_approval',
         'reorder_sicoob_order_as_quote',
         'request_sicoob_order_approval',
         'require_sicoob_artwork_before_production',
         'set_quote_hierarchy',
         'sicoob_actor_can_approve',
         'sicoob_actor_can_manage_consolidation',
         'sicoob_actor_can_manage_finance',
         'sicoob_actor_can_manage_fulfillment',
         'sicoob_actor_can_receive_consolidation',
         'sicoob_actor_can_receive_destination',
         'sicoob_actor_can_request_approval',
         'sicoob_actor_can_view_all_consolidation',
         'transition_sicoob_order_status',
         'upsert_sicoob_order_shipment',
         'validate_order_status_transition',
         'validate_sicoob_order_budget'
       ]::text[])
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      target
    );
  END LOOP;
END
$acl$;

GRANT EXECUTE ON FUNCTION public.add_sicoob_order_invoice(uuid, text, text, text, numeric, text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_sicoob_order(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_sicoob_order(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_sicoob_order_consolidation(uuid[], uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_sicoob_order_artwork(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_sicoob_order_consolidation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sicoob_consolidation_sellers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sicoob_order_shipment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_sicoob_order_confirmation(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_sicoob_delivery_receipt(uuid, uuid, integer, integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_sicoob_order_payment(uuid, integer, numeric, date, text, uuid, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_sicoob_order_payment(uuid, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_sicoob_order(uuid, uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_sicoob_order_without_approval(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_sicoob_order_approval(uuid, text, text, numeric, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_sicoob_order_status(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_sicoob_order_shipment(uuid, text, text, text, date, text) TO authenticated;
