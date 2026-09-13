-- Follow-up de 20260912180000_sicoob_finance_artwork.sql
--
-- Complementa uma migration já mesclada em main (pode já ter rodado em
-- produção) sem editá-la — ver docs/correcoes-validacao-2026-09-13.md.


DROP POLICY IF EXISTS "sicoob_order_documents_delete_orphan_artwork" ON storage.objects;
CREATE POLICY "sicoob_order_documents_delete_orphan_artwork" ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'sicoob-order-documents'
  AND owner = auth.uid()
  AND name ~ '^[0-9a-fA-F-]+/artwork/.+\.(pdf|png|jpg|jpeg|webp)$'
  AND public.sicoob_actor_can_manage_fulfillment(auth.uid(), split_part(name, '/', 1)::uuid)
  AND NOT EXISTS (
    SELECT 1 FROM public.sicoob_order_artwork_versions artwork
    WHERE artwork.file_path = name
  )
);


CREATE OR REPLACE FUNCTION public.record_sicoob_order_payment(
  p_order_id uuid,
  p_installment_number integer,
  p_amount numeric,
  p_due_date date,
  p_status text DEFAULT 'pending',
  p_invoice_id uuid DEFAULT NULL,
  p_payment_method text DEFAULT NULL,
  p_external_reference text DEFAULT NULL,
  p_expected_updated_at timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_order public.sicoob_orders%ROWTYPE;
  v_existing public.sicoob_order_payments%ROWTYPE;
  v_payment_id uuid;
  v_active_total numeric;
BEGIN
  IF v_actor_id IS NULL OR NOT public.sicoob_actor_can_manage_finance(v_actor_id, p_order_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Você não pode registrar pagamentos neste pedido.';
  END IF;
  IF p_installment_number <= 0 OR p_amount <= 0 OR p_due_date IS NULL
     OR p_status NOT IN ('pending', 'paid', 'cancelled') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Dados da parcela são inválidos.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_order_id::text || ':finance', 0));
  SELECT * INTO v_order FROM public.sicoob_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Pedido não encontrado.';
  END IF;
  IF v_order.status NOT IN ('confirmed', 'logistic', 'in_production', 'in_separation', 'in_transit', 'delivered', 'completed') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O pedido precisa estar confirmado para receber parcelas.';
  END IF;
  IF p_invoice_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.sicoob_order_invoices
     WHERE id = p_invoice_id AND order_id = p_order_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'A nota fiscal não pertence ao pedido.';
  END IF;

  SELECT * INTO v_existing
    FROM public.sicoob_order_payments
   WHERE order_id = p_order_id AND installment_number = p_installment_number
   FOR UPDATE;
  IF FOUND AND p_expected_updated_at IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'A parcela já existe; informe a versão atual antes de alterar.';
  END IF;
  IF FOUND AND p_expected_updated_at IS NOT NULL
     AND v_existing.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'A parcela mudou; atualize a página antes de salvar.';
  END IF;
  IF FOUND AND v_existing.status IN ('paid', 'refunded')
     AND (
       v_existing.invoice_id IS DISTINCT FROM p_invoice_id
       OR v_existing.amount IS DISTINCT FROM p_amount
       OR v_existing.due_date IS DISTINCT FROM p_due_date
       OR v_existing.status IS DISTINCT FROM p_status
       OR v_existing.payment_method IS DISTINCT FROM NULLIF(trim(p_payment_method), '')
       OR v_existing.external_reference IS DISTINCT FROM NULLIF(trim(p_external_reference), '')
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Parcela liquidada exige estorno formal antes de outra alteração.';
  END IF;

  SELECT COALESCE(sum(amount), 0) INTO v_active_total
    FROM public.sicoob_order_payments
   WHERE order_id = p_order_id
     AND installment_number <> p_installment_number
     AND status IN ('pending', 'paid', 'overdue');
  IF p_status IN ('pending', 'paid') AND v_active_total + p_amount > v_order.total_amount THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'A soma das parcelas supera o valor do pedido.';
  END IF;

  PERFORM set_config('app.sicoob_payment_operation', 'record', true);
  INSERT INTO public.sicoob_order_payments (
    order_id, invoice_id, installment_number, amount, due_date, paid_at,
    payment_method, external_reference, status, created_by, updated_by
  ) VALUES (
    p_order_id, p_invoice_id, p_installment_number, p_amount, p_due_date,
    CASE WHEN p_status = 'paid' THEN now() ELSE NULL END,
    NULLIF(trim(p_payment_method), ''), NULLIF(trim(p_external_reference), ''),
    p_status, v_actor_id, v_actor_id
  )
  ON CONFLICT (order_id, installment_number) DO UPDATE SET
    invoice_id = EXCLUDED.invoice_id,
    amount = EXCLUDED.amount,
    due_date = EXCLUDED.due_date,
    paid_at = CASE
      WHEN EXCLUDED.status = 'paid' THEN COALESCE(public.sicoob_order_payments.paid_at, now())
      ELSE NULL
    END,
    payment_method = EXCLUDED.payment_method,
    external_reference = EXCLUDED.external_reference,
    status = EXCLUDED.status,
    updated_by = v_actor_id,
    updated_at = now()
  RETURNING id INTO v_payment_id;
  RETURN v_payment_id;
END;
$$;

