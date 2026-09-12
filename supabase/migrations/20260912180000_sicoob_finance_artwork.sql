-- Documentos financeiros e arte/piloto canônicos do domínio Sicoob.
-- As tabelas legadas order_* referenciam public.orders e não devem receber
-- identificadores de public.sicoob_orders.

CREATE TABLE IF NOT EXISTS public.sicoob_order_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.sicoob_orders(id) ON DELETE RESTRICT,
  invoice_number text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('pdf', 'xml')),
  file_path text NOT NULL,
  amount numeric(14,2) CHECK (amount IS NULL OR amount >= 0),
  access_key text,
  issued_at date,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, invoice_number, file_type),
  CHECK (length(trim(invoice_number)) > 0),
  CHECK (file_path LIKE order_id::text || '/invoices/%')
);

CREATE TABLE IF NOT EXISTS public.sicoob_order_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.sicoob_orders(id) ON DELETE RESTRICT,
  invoice_id uuid REFERENCES public.sicoob_order_invoices(id) ON DELETE SET NULL,
  installment_number integer NOT NULL DEFAULT 1 CHECK (installment_number > 0),
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  due_date date NOT NULL,
  paid_at timestamptz,
  refunded_at timestamptz,
  refunded_by uuid REFERENCES auth.users(id),
  refund_reason text,
  payment_method text,
  external_reference text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled', 'refunded')),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  updated_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, installment_number),
  CHECK ((status = 'paid' AND paid_at IS NOT NULL) OR status <> 'paid'),
  CONSTRAINT sicoob_order_payments_refund_audit_check CHECK (
    (status = 'refunded' AND refunded_at IS NOT NULL AND refunded_by IS NOT NULL AND length(trim(refund_reason)) >= 10)
    OR (status <> 'refunded' AND refunded_at IS NULL AND refunded_by IS NULL AND refund_reason IS NULL)
  )
);

ALTER TABLE public.sicoob_order_payments
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS refunded_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS refund_reason text;

-- Registros legados que já nasceram como `refunded` recebem uma marca explícita
-- de migração; novas ocorrências só podem passar pelo RPC formal abaixo.
UPDATE public.sicoob_order_payments
   SET refunded_at = COALESCE(refunded_at, paid_at, updated_at, created_at),
       refunded_by = COALESCE(refunded_by, updated_by),
       refund_reason = COALESCE(NULLIF(trim(refund_reason), ''), 'Migração de estorno legado sem motivo registrado')
 WHERE status = 'refunded'
   AND (refunded_at IS NULL OR refunded_by IS NULL OR length(trim(COALESCE(refund_reason, ''))) < 10);
UPDATE public.sicoob_order_payments
   SET refunded_at = NULL, refunded_by = NULL, refund_reason = NULL
 WHERE status <> 'refunded'
   AND (refunded_at IS NOT NULL OR refunded_by IS NOT NULL OR refund_reason IS NOT NULL);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.sicoob_order_payments'::regclass
      AND conname = 'sicoob_order_payments_refund_audit_check'
  ) THEN
    ALTER TABLE public.sicoob_order_payments
      ADD CONSTRAINT sicoob_order_payments_refund_audit_check CHECK (
        (status = 'refunded' AND refunded_at IS NOT NULL AND refunded_by IS NOT NULL AND length(trim(refund_reason)) >= 10)
        OR (status <> 'refunded' AND refunded_at IS NULL AND refunded_by IS NULL AND refund_reason IS NULL)
      );
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_sicoob_order_payment_external_reference
  ON public.sicoob_order_payments(order_id, external_reference)
  WHERE external_reference IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.sicoob_order_artwork_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.sicoob_orders(id) ON DELETE RESTRICT,
  version integer NOT NULL CHECK (version > 0),
  file_path text NOT NULL,
  file_sha256 text NOT NULL CHECK (file_sha256 ~ '^[0-9a-f]{64}$'),
  identity_snapshot jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revision')),
  is_latest boolean NOT NULL DEFAULT true,
  feedback text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  decided_by uuid REFERENCES auth.users(id),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, version),
  CHECK (file_path LIKE order_id::text || '/artwork/%'),
  CHECK (jsonb_typeof(identity_snapshot) = 'object'),
  CHECK (
    (status = 'pending' AND decided_by IS NULL AND decided_at IS NULL)
    OR (status <> 'pending' AND decided_by IS NOT NULL AND decided_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_sicoob_order_artwork_latest
  ON public.sicoob_order_artwork_versions(order_id) WHERE is_latest;
CREATE INDEX IF NOT EXISTS idx_sicoob_order_invoices_order ON public.sicoob_order_invoices(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sicoob_order_payments_order ON public.sicoob_order_payments(order_id, due_date);
CREATE INDEX IF NOT EXISTS idx_sicoob_order_artwork_order ON public.sicoob_order_artwork_versions(order_id, version DESC);

ALTER TABLE public.sicoob_order_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sicoob_order_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sicoob_order_artwork_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sicoob_invoices_read_in_order_scope" ON public.sicoob_order_invoices
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.sicoob_orders o WHERE o.id = order_id)
);
CREATE POLICY "sicoob_payments_read_in_order_scope" ON public.sicoob_order_payments
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.sicoob_orders o WHERE o.id = order_id)
);
CREATE POLICY "sicoob_artwork_read_in_order_scope" ON public.sicoob_order_artwork_versions
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.sicoob_orders o WHERE o.id = order_id)
);

CREATE POLICY "sicoob_order_documents_upload_invoice" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'sicoob-order-documents'
  AND name ~ '^[0-9a-fA-F-]+/invoices/.+\.(pdf|xml)$'
  AND public.sicoob_actor_can_manage_fulfillment(auth.uid(), split_part(name, '/', 1)::uuid)
);
CREATE POLICY "sicoob_order_documents_upload_artwork" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'sicoob-order-documents'
  AND name ~ '^[0-9a-fA-F-]+/artwork/.+\.(pdf|png|jpg|jpeg|webp)$'
  AND public.sicoob_actor_can_manage_fulfillment(auth.uid(), split_part(name, '/', 1)::uuid)
);
CREATE POLICY "sicoob_order_documents_delete_orphan_invoice" ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'sicoob-order-documents'
  AND owner = auth.uid()
  AND name ~ '^[0-9a-fA-F-]+/invoices/.+\.(pdf|xml)$'
  AND public.sicoob_actor_can_manage_fulfillment(auth.uid(), split_part(name, '/', 1)::uuid)
);

CREATE OR REPLACE FUNCTION public.add_sicoob_order_invoice(
  p_order_id uuid,
  p_invoice_number text,
  p_file_type text,
  p_file_path text,
  p_amount numeric DEFAULT NULL,
  p_access_key text DEFAULT NULL,
  p_issued_at date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_invoice_id uuid;
BEGIN
  IF v_actor_id IS NULL OR NOT public.sicoob_actor_can_manage_fulfillment(v_actor_id, p_order_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Você não pode anexar documentos a este pedido.';
  END IF;
  IF p_file_type NOT IN ('pdf', 'xml')
     OR p_file_path NOT LIKE p_order_id::text || '/invoices/%'
     OR NULLIF(trim(p_invoice_number), '') IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Dados da nota fiscal inválidos.';
  END IF;

  INSERT INTO public.sicoob_order_invoices (
    order_id, invoice_number, file_type, file_path, amount, access_key, issued_at, created_by
  ) VALUES (
    p_order_id, trim(p_invoice_number), p_file_type, p_file_path,
    p_amount, NULLIF(trim(p_access_key), ''), p_issued_at, v_actor_id
  ) RETURNING id INTO v_invoice_id;
  RETURN v_invoice_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_sicoob_order_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(current_setting('app.sicoob_payment_operation', true), '') NOT IN ('record', 'refund') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Pagamentos só podem ser alterados pelo fluxo financeiro formal.';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Registros financeiros não podem ser excluídos.';
  END IF;
  IF TG_OP = 'UPDATE' AND (
    NEW.order_id IS DISTINCT FROM OLD.order_id
    OR NEW.installment_number IS DISTINCT FROM OLD.installment_number
    OR NEW.created_by IS DISTINCT FROM OLD.created_by
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Identidade da parcela financeira é imutável.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sicoob_actor_can_manage_finance(
  p_actor_id uuid,
  p_order_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.sicoob_actor_can_manage_fulfillment(p_actor_id, p_order_id)
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = p_actor_id
        AND ur.role::text IN ('dev', 'supervisor', 'admin', 'manager', 'gestor_compras', 'comprador_singular')
    );
$$;

DROP TRIGGER IF EXISTS tr_protect_sicoob_order_payment ON public.sicoob_order_payments;
CREATE TRIGGER tr_protect_sicoob_order_payment
BEFORE INSERT OR UPDATE OR DELETE ON public.sicoob_order_payments
FOR EACH ROW EXECUTE FUNCTION public.protect_sicoob_order_payment();

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
       v_existing.amount IS DISTINCT FROM p_amount
       OR v_existing.due_date IS DISTINCT FROM p_due_date
       OR v_existing.status IS DISTINCT FROM p_status
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

CREATE OR REPLACE FUNCTION public.refund_sicoob_order_payment(
  p_payment_id uuid,
  p_reason text,
  p_expected_updated_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_order_id uuid;
  v_payment public.sicoob_order_payments%ROWTYPE;
BEGIN
  IF v_actor_id IS NULL OR length(trim(COALESCE(p_reason, ''))) < 10 OR p_expected_updated_at IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Motivo e versão atual da parcela são obrigatórios para o estorno.';
  END IF;
  SELECT order_id INTO v_order_id FROM public.sicoob_order_payments WHERE id = p_payment_id;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Parcela não encontrada.'; END IF;
  IF NOT public.sicoob_actor_can_manage_finance(v_actor_id, v_order_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Você não pode estornar pagamentos deste pedido.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_order_id::text || ':finance', 0));
  SELECT * INTO v_payment FROM public.sicoob_order_payments WHERE id = p_payment_id FOR UPDATE;
  IF v_payment.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'A parcela mudou; atualize a página antes de estornar.';
  END IF;
  IF v_payment.status <> 'paid' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Somente uma parcela paga pode ser estornada.';
  END IF;

  PERFORM set_config('app.sicoob_payment_operation', 'refund', true);
  UPDATE public.sicoob_order_payments
     SET status = 'refunded',
         refunded_at = now(),
         refunded_by = v_actor_id,
         refund_reason = trim(p_reason),
         updated_by = v_actor_id,
         updated_at = now()
   WHERE id = p_payment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_sicoob_order_artwork(
  p_artwork_id uuid,
  p_status text,
  p_feedback text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_artwork public.sicoob_order_artwork_versions%ROWTYPE;
BEGIN
  IF p_status NOT IN ('approved', 'rejected', 'revision') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Decisão de arte inválida.';
  END IF;
  IF p_status <> 'approved' AND length(trim(COALESCE(p_feedback, ''))) < 10 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Informe um feedback com ao menos 10 caracteres.';
  END IF;

  SELECT * INTO v_artwork FROM public.sicoob_order_artwork_versions
   WHERE id = p_artwork_id FOR UPDATE;
  IF NOT FOUND OR NOT v_artwork.is_latest OR v_artwork.status <> 'pending' THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'A versão de arte mudou; atualize a página.';
  END IF;
  PERFORM public.assert_sicoob_approval_actor(v_actor_id, v_artwork.order_id, v_artwork.created_by, false);

  PERFORM set_config('app.sicoob_artwork_operation', 'decide', true);
  UPDATE public.sicoob_order_artwork_versions
     SET status = p_status,
         feedback = NULLIF(trim(p_feedback), ''),
         decided_by = v_actor_id,
         decided_at = now()
   WHERE id = v_artwork.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_sicoob_order_artwork_version(
  p_order_id uuid,
  p_file_path text,
  p_file_sha256 text,
  p_identity_snapshot jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_artwork_id uuid;
  v_version integer;
  v_order_status text;
BEGIN
  IF v_actor_id IS NULL OR NOT public.sicoob_actor_can_manage_fulfillment(v_actor_id, p_order_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Você não pode enviar arte para este pedido.';
  END IF;
  IF p_file_path NOT LIKE p_order_id::text || '/artwork/%'
     OR p_file_sha256 !~ '^[0-9a-f]{64}$'
     OR jsonb_typeof(p_identity_snapshot) IS DISTINCT FROM 'object'
     OR p_identity_snapshot = '{}'::jsonb THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Arquivo, hash ou fotografia de identidade inválidos.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_order_id::text || ':artwork', 0));
  SELECT status INTO v_order_status FROM public.sicoob_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Pedido não encontrado.'; END IF;
  IF v_order_status NOT IN ('draft', 'pending', 'waiting_approval', 'escalated_to_board', 'confirmed') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'A arte não pode ser substituída após o início da produção ou logística.';
  END IF;
  SELECT COALESCE(max(version), 0) + 1 INTO v_version
    FROM public.sicoob_order_artwork_versions WHERE order_id = p_order_id;
  PERFORM set_config('app.sicoob_artwork_operation', 'version', true);
  UPDATE public.sicoob_order_artwork_versions SET is_latest = false
   WHERE order_id = p_order_id AND is_latest;

  INSERT INTO public.sicoob_order_artwork_versions (
    order_id, version, file_path, file_sha256, identity_snapshot, created_by
  ) VALUES (
    p_order_id, v_version, p_file_path, p_file_sha256, p_identity_snapshot, v_actor_id
  ) RETURNING id INTO v_artwork_id;
  RETURN v_artwork_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_sicoob_order_artwork_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Versões de arte não podem ser excluídas.';
  END IF;
  IF NEW.order_id IS DISTINCT FROM OLD.order_id
     OR NEW.version IS DISTINCT FROM OLD.version
     OR NEW.file_path IS DISTINCT FROM OLD.file_path
     OR NEW.file_sha256 IS DISTINCT FROM OLD.file_sha256
     OR NEW.identity_snapshot IS DISTINCT FROM OLD.identity_snapshot
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'A versão de arte é imutável.';
  END IF;
  IF NEW.is_latest IS DISTINCT FROM OLD.is_latest
     AND current_setting('app.sicoob_artwork_operation', true) IS DISTINCT FROM 'version' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Somente uma nova versão pode substituir a arte vigente.';
  END IF;
  IF (NEW.status IS DISTINCT FROM OLD.status
      OR NEW.feedback IS DISTINCT FROM OLD.feedback
      OR NEW.decided_by IS DISTINCT FROM OLD.decided_by
      OR NEW.decided_at IS DISTINCT FROM OLD.decided_at)
     AND current_setting('app.sicoob_artwork_operation', true) IS DISTINCT FROM 'decide' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'A decisão exige o fluxo formal de aprovação da arte.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_sicoob_order_artwork_version ON public.sicoob_order_artwork_versions;
CREATE TRIGGER tr_protect_sicoob_order_artwork_version
BEFORE UPDATE OR DELETE ON public.sicoob_order_artwork_versions
FOR EACH ROW EXECUTE FUNCTION public.protect_sicoob_order_artwork_version();

CREATE OR REPLACE FUNCTION public.require_sicoob_artwork_before_production()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('logistic', 'in_production')
     AND OLD.status IS DISTINCT FROM NEW.status
     AND (
       NEW.is_pilot_order IS TRUE
       OR EXISTS (SELECT 1 FROM public.sicoob_order_artwork_versions a WHERE a.order_id = NEW.id)
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.sicoob_order_artwork_versions a
        WHERE a.order_id = NEW.id AND a.is_latest AND a.status = 'approved'
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'A versão vigente da arte precisa estar aprovada antes da produção.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_require_sicoob_artwork_before_production ON public.sicoob_orders;
CREATE TRIGGER tr_require_sicoob_artwork_before_production
BEFORE UPDATE OF status ON public.sicoob_orders
FOR EACH ROW EXECUTE FUNCTION public.require_sicoob_artwork_before_production();

REVOKE ALL ON FUNCTION public.add_sicoob_order_invoice(uuid, text, text, text, numeric, text, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_sicoob_order_payment(uuid, integer, numeric, date, text, uuid, text, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refund_sicoob_order_payment(uuid, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_sicoob_order_payment() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sicoob_actor_can_manage_finance(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_sicoob_order_artwork_version(uuid, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decide_sicoob_order_artwork(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_sicoob_order_artwork_version() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.require_sicoob_artwork_before_production() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_sicoob_order_invoice(uuid, text, text, text, numeric, text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sicoob_actor_can_manage_fulfillment(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_sicoob_order_payment(uuid, integer, numeric, date, text, uuid, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_sicoob_order_payment(uuid, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_sicoob_order_artwork_version(uuid, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_sicoob_order_artwork(uuid, text, text) TO authenticated;
