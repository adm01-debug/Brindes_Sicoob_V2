-- ============================================================
-- APLICAR NO SUPABASE SQL EDITOR — projeto cfmzkthhgliqelozlmwu
-- Reconciliacao Sicoob: 9 tabelas + RPCs restantes
-- Gerado em 16/09/2026 a partir das migrations ja revisadas
-- ============================================================
BEGIN;

-- Recompra Sicoob atômica e idempotente. A Edge Function autenticada consulta
-- o catálogo externo e chama esta RPC interna com o ator validado. O navegador
-- não pode fornecer diretamente preço, disponibilidade ou timestamp.

ALTER TABLE public.sicoob_order_items
  ADD COLUMN IF NOT EXISTS product_sku text,
  ADD COLUMN IF NOT EXISTS product_image_url text,
  ADD COLUMN IF NOT EXISTS variant_id text,
  ADD COLUMN IF NOT EXISTS variant_sku text,
  ADD COLUMN IF NOT EXISTS color_name text,
  ADD COLUMN IF NOT EXISTS color_hex text,
  ADD COLUMN IF NOT EXISTS size_code text,
  ADD COLUMN IF NOT EXISTS personalization_snapshot jsonb;

ALTER TABLE public.quote_items
  ADD COLUMN IF NOT EXISTS source_variant_id text,
  ADD COLUMN IF NOT EXISTS source_variant_sku text,
  ADD COLUMN IF NOT EXISTS catalog_checked_at timestamptz;

CREATE TABLE IF NOT EXISTS public.sicoob_reorder_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  source_order_id uuid NOT NULL REFERENCES public.sicoob_orders(id) ON DELETE RESTRICT,
  idempotency_key text NOT NULL,
  payload_hash text NOT NULL,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (actor_id, source_order_id, idempotency_key),
  CHECK (length(idempotency_key) BETWEEN 8 AND 128),
  CHECK (length(payload_hash) = 64)
);

CREATE INDEX IF NOT EXISTS idx_sicoob_reorder_requests_source
  ON public.sicoob_reorder_requests (source_order_id, created_at DESC);

ALTER TABLE public.sicoob_reorder_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuário consulta as próprias recompras Sicoob" ON public.sicoob_reorder_requests;
CREATE POLICY "Usuário consulta as próprias recompras Sicoob"
ON public.sicoob_reorder_requests
FOR SELECT TO authenticated
USING (actor_id = auth.uid());

-- O gatilho legado deriva a hierarquia do vendedor. Durante a recompra, a RPC
-- já validou o pedido de origem e deve preservar a hierarquia desse pedido.
CREATE OR REPLACE FUNCTION public.set_quote_hierarchy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pa_id uuid;
  v_cooperative_id uuid;
BEGIN
  IF current_setting('app.sicoob_reorder_operation', true) = 'create' THEN
    RETURN NEW;
  END IF;

  SELECT pa_id, cooperativa_id
    INTO v_pa_id, v_cooperative_id
    FROM public.profiles
   WHERE user_id = NEW.seller_id;

  NEW.pa_id := v_pa_id;
  NEW.singular_id := v_cooperative_id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_quote_hierarchy() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.reorder_sicoob_order_as_quote(
  p_order_id uuid,
  p_items jsonb,
  p_idempotency_key text,
  p_actor_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := p_actor_id;
  v_order public.sicoob_orders%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_existing public.sicoob_reorder_requests%ROWTYPE;
  v_item jsonb;
  v_source_item public.sicoob_order_items%ROWTYPE;
  v_payload_hash text;
  v_quote_id uuid;
  v_total numeric(14,2) := 0;
  v_checked_at timestamptz;
  v_stable_items jsonb;
  v_pa_name text;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Autenticação necessária para refazer o pedido.';
  END IF;

  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) NOT BETWEEN 8 AND 128 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Chave de idempotência inválida.';
  END IF;

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_items) = 0
     OR jsonb_array_length(p_items) > 100 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A recompra deve conter entre 1 e 100 itens.';
  END IF;

  SELECT * INTO v_order
    FROM public.sicoob_orders
   WHERE id = p_order_id
   FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Pedido de origem não encontrado.';
  END IF;
  IF v_order.status IS DISTINCT FROM 'completed' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Somente pedidos concluídos podem ser refeitos.';
  END IF;

  IF jsonb_array_length(p_items) IS DISTINCT FROM (
       SELECT count(*)::integer FROM public.sicoob_order_items WHERE order_id = v_order.id
     )
     OR jsonb_array_length(p_items) IS DISTINCT FROM (
       SELECT count(DISTINCT item ->> 'source_order_item_id')::integer
         FROM jsonb_array_elements(p_items) AS source(item)
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A recompra deve representar cada item do pedido uma única vez.';
  END IF;

  SELECT * INTO v_profile
    FROM public.profiles
   WHERE user_id = v_actor_id
     AND is_active IS TRUE
     AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O usuário não possui perfil ativo.';
  END IF;

  IF v_order.created_by IS DISTINCT FROM v_actor_id
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = v_actor_id
          AND ur.role::text IN ('admin', 'dev', 'supervisor')
     )
     AND NOT (
       v_profile.pa_id IS NOT NULL
       AND v_profile.pa_id = v_order.pa_id
       AND EXISTS (
         SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = v_actor_id
            AND ur.role::text IN ('gerente_pa', 'comprador_pac', 'gestor_compras')
       )
     )
     AND NOT (
       v_profile.cooperativa_id IS NOT NULL
       AND v_profile.cooperativa_id = v_order.cooperative_id
       AND EXISTS (
         SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = v_actor_id
            AND ur.role::text IN ('comprador_singular', 'gestor_compras')
       )
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Você não pode refazer este pedido.';
  END IF;

  SELECT jsonb_agg(item - 'catalog_checked_at' ORDER BY item ->> 'source_order_item_id')
    INTO v_stable_items
    FROM jsonb_array_elements(p_items) AS source(item);
  v_payload_hash := encode(digest(v_stable_items::text, 'sha256'), 'hex');
  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_actor_id::text || ':' || p_order_id::text || ':' || trim(p_idempotency_key), 0)
  );

  SELECT * INTO v_existing
    FROM public.sicoob_reorder_requests
   WHERE actor_id = v_actor_id
     AND source_order_id = p_order_id
     AND idempotency_key = trim(p_idempotency_key);
  IF FOUND THEN
    IF v_existing.payload_hash IS DISTINCT FROM v_payload_hash THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A chave de idempotência já foi usada com conteúdo diferente.';
    END IF;
    RETURN v_existing.quote_id;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    IF NULLIF(v_item ->> 'source_order_item_id', '') IS NULL
       OR NULLIF(v_item ->> 'product_id', '') IS NULL
       OR NULLIF(trim(v_item ->> 'product_name'), '') IS NULL
       OR COALESCE((v_item ->> 'quantity')::integer, 0) <= 0
       OR COALESCE((v_item ->> 'unit_price')::numeric, 0) <= 0 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Item de recompra inválido.';
    END IF;

    SELECT * INTO v_source_item
      FROM public.sicoob_order_items
     WHERE id = (v_item ->> 'source_order_item_id')::uuid
       AND order_id = v_order.id;
    IF NOT FOUND
       OR v_source_item.product_id::text IS DISTINCT FROM (v_item ->> 'product_id')
       OR v_source_item.quantity IS DISTINCT FROM (v_item ->> 'quantity')::integer THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'O item não corresponde ao pedido de origem.';
    END IF;

    v_checked_at := NULLIF(v_item ->> 'catalog_checked_at', '')::timestamptz;
    IF v_checked_at IS NULL
       OR v_checked_at < now() - interval '5 minutes'
       OR v_checked_at > now() + interval '1 minute' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Preço e estoque precisam ser consultados novamente.';
    END IF;

    IF COALESCE((v_item ->> 'minimum_quantity')::integer, 1) > (v_item ->> 'quantity')::integer THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Quantidade abaixo do mínimo vigente do produto.';
    END IF;

    IF NULLIF(v_source_item.variant_id, '') IS NOT NULL
       AND v_source_item.variant_id IS DISTINCT FROM NULLIF(v_item ->> 'source_variant_id', '') THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A variante não corresponde ao pedido de origem.';
    END IF;

    v_total := v_total + ((v_item ->> 'quantity')::integer * (v_item ->> 'unit_price')::numeric);
  END LOOP;

  SELECT nome INTO v_pa_name
    FROM public.postos_atendimento
   WHERE id = v_order.pa_id;

  PERFORM set_config('app.sicoob_reorder_operation', 'create', true);
  INSERT INTO public.quotes (
    client_id, client_name, seller_id, status, subtotal, total, notes,
    organization_id, pa_id, singular_id
  ) VALUES (
    NULL,
    COALESCE(v_pa_name, 'Unidade Sicoob'),
    v_actor_id,
    'draft',
    v_total,
    v_total,
    format('Recompra do pedido Sicoob #%s. Preço e estoque revalidados antes da criação.', COALESCE(v_order.id::text, '')),
    v_profile.organization_id,
    v_order.pa_id,
    v_order.cooperative_id
  )
  RETURNING id INTO v_quote_id;

  INSERT INTO public.quote_items (
    quote_id, product_id, product_name, product_sku, product_image_url,
    quantity, unit_price, color_name, color_hex, size_code,
    source_variant_id, source_variant_sku, catalog_checked_at, sort_order
  )
  SELECT
    v_quote_id,
    item ->> 'product_id',
    item ->> 'product_name',
    NULLIF(item ->> 'product_sku', ''),
    NULLIF(item ->> 'product_image_url', ''),
    (item ->> 'quantity')::integer,
    (item ->> 'unit_price')::numeric,
    NULLIF(item ->> 'color_name', ''),
    NULLIF(item ->> 'color_hex', ''),
    NULLIF(item ->> 'size_code', ''),
    NULLIF(item ->> 'source_variant_id', ''),
    NULLIF(item ->> 'source_variant_sku', ''),
    (item ->> 'catalog_checked_at')::timestamptz,
    ordinality::integer - 1
  FROM jsonb_array_elements(p_items) WITH ORDINALITY AS source(item, ordinality);

  INSERT INTO public.sicoob_reorder_requests (
    actor_id, source_order_id, idempotency_key, payload_hash, quote_id
  ) VALUES (
    v_actor_id, p_order_id, trim(p_idempotency_key), v_payload_hash, v_quote_id
  );

  RETURN v_quote_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_sicoob_order_as_quote(uuid, jsonb, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_sicoob_order_as_quote(uuid, jsonb, text, uuid) TO service_role;

COMMENT ON FUNCTION public.reorder_sicoob_order_as_quote(uuid, jsonb, text, uuid) IS
  'RPC interna: cria orçamento de recompra atômico com catálogo revalidado pela Edge Function.';

-- ---- proxima migration ----

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
CREATE UNIQUE INDEX IF NOT EXISTS ux_sicoob_order_artwork_path
  ON public.sicoob_order_artwork_versions(order_id, file_path);
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
  p_actor_id uuid,
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
  v_artwork_id uuid;
  v_existing public.sicoob_order_artwork_versions%ROWTYPE;
  v_version integer;
  v_order_status text;
BEGIN
  IF auth.jwt() ->> 'role' IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O registro da arte exige o verificador interno.';
  END IF;
  IF p_actor_id IS NULL OR NOT public.sicoob_actor_can_manage_fulfillment(p_actor_id, p_order_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Você não pode enviar arte para este pedido.';
  END IF;
  IF p_file_path NOT LIKE p_order_id::text || '/artwork/%'
     OR p_file_sha256 !~ '^[0-9a-f]{64}$'
     OR jsonb_typeof(p_identity_snapshot) IS DISTINCT FROM 'object'
     OR p_identity_snapshot ->> 'bucket' IS DISTINCT FROM 'sicoob-order-documents'
     OR p_identity_snapshot ->> 'path' IS DISTINCT FROM p_file_path
     OR p_identity_snapshot ->> 'sha256' IS DISTINCT FROM p_file_sha256
     OR p_identity_snapshot ->> 'verifier' IS DISTINCT FROM 'sicoob-artwork-register'
     OR COALESCE(p_identity_snapshot ->> 'byte_size', '') !~ '^[1-9][0-9]*$'
     OR COALESCE(p_identity_snapshot ->> 'verified_at', '') = '' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Arquivo, hash ou fotografia de identidade inválidos.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_order_id::text || ':artwork', 0));
  SELECT * INTO v_existing
    FROM public.sicoob_order_artwork_versions
   WHERE order_id = p_order_id AND file_path = p_file_path
   FOR UPDATE;
  IF FOUND THEN
    IF v_existing.file_sha256 IS DISTINCT FROM p_file_sha256
       OR v_existing.created_by IS DISTINCT FROM p_actor_id THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'O caminho da arte já foi registrado com outra identidade.';
    END IF;
    RETURN v_existing.id;
  END IF;

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
    p_order_id, v_version, p_file_path, p_file_sha256, p_identity_snapshot, p_actor_id
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
REVOKE ALL ON FUNCTION public.create_sicoob_order_artwork_version(uuid, uuid, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decide_sicoob_order_artwork(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_sicoob_order_artwork_version() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.require_sicoob_artwork_before_production() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_sicoob_order_invoice(uuid, text, text, text, numeric, text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sicoob_actor_can_manage_fulfillment(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_sicoob_order_payment(uuid, integer, numeric, date, text, uuid, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_sicoob_order_payment(uuid, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_sicoob_order_artwork_version(uuid, uuid, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.decide_sicoob_order_artwork(uuid, text, text) TO authenticated;

-- ---- proxima migration ----

-- Consolidação canônica: vínculo atômico de pedidos, distribuição por PA e
-- recebimento parcial por item. Substitui a função histórica que criava
-- somente um cabeçalho vazio.

ALTER TABLE public.order_consolidations
  ADD COLUMN IF NOT EXISTS idempotency_key uuid,
  ADD COLUMN IF NOT EXISTS received_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS ux_order_consolidations_idempotency
  ON public.order_consolidations(idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.sicoob_orders
  ADD COLUMN IF NOT EXISTS consolidation_id uuid REFERENCES public.order_consolidations(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS ux_sicoob_orders_one_consolidation
  ON public.sicoob_orders(consolidation_id, id) WHERE consolidation_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.order_consolidation_orders (
  consolidation_id uuid NOT NULL REFERENCES public.order_consolidations(id) ON DELETE RESTRICT,
  order_id uuid NOT NULL UNIQUE REFERENCES public.sicoob_orders(id) ON DELETE RESTRICT,
  order_total_snapshot numeric(14,2) NOT NULL CHECK (order_total_snapshot >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (consolidation_id, order_id)
);

CREATE TABLE IF NOT EXISTS public.sicoob_delivery_destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consolidation_id uuid NOT NULL REFERENCES public.order_consolidations(id) ON DELETE RESTRICT,
  pa_id uuid NOT NULL REFERENCES public.postos_atendimento(id) ON DELETE RESTRICT,
  destination_name text NOT NULL CHECK (length(trim(destination_name)) > 0),
  address_snapshot jsonb NOT NULL CHECK (jsonb_typeof(address_snapshot) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (consolidation_id, pa_id)
);

CREATE TABLE IF NOT EXISTS public.sicoob_delivery_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id uuid NOT NULL REFERENCES public.sicoob_delivery_destinations(id) ON DELETE RESTRICT,
  order_item_id uuid NOT NULL REFERENCES public.sicoob_order_items(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  received_quantity integer NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
  damaged_quantity integer NOT NULL DEFAULT 0 CHECK (damaged_quantity >= 0),
  missing_quantity integer NOT NULL DEFAULT 0 CHECK (missing_quantity >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (destination_id, order_item_id),
  CHECK (received_quantity + damaged_quantity + missing_quantity <= quantity)
);

CREATE TABLE IF NOT EXISTS public.sicoob_delivery_receipt_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key uuid NOT NULL,
  allocation_id uuid NOT NULL REFERENCES public.sicoob_delivery_allocations(id) ON DELETE RESTRICT,
  received_quantity integer NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
  damaged_quantity integer NOT NULL DEFAULT 0 CHECK (damaged_quantity >= 0),
  missing_quantity integer NOT NULL DEFAULT 0 CHECK (missing_quantity >= 0),
  notes text,
  received_by uuid NOT NULL REFERENCES auth.users(id),
  received_at timestamptz NOT NULL DEFAULT now(),
  CHECK (received_quantity + damaged_quantity + missing_quantity > 0),
  CHECK ((damaged_quantity + missing_quantity = 0) OR length(trim(COALESCE(notes, ''))) >= 10)
);

ALTER TABLE public.sicoob_delivery_receipt_events
  ADD COLUMN IF NOT EXISTS idempotency_key uuid;
UPDATE public.sicoob_delivery_receipt_events
   SET idempotency_key = gen_random_uuid()
 WHERE idempotency_key IS NULL;
ALTER TABLE public.sicoob_delivery_receipt_events
  ALTER COLUMN idempotency_key SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_sicoob_delivery_receipt_idempotency
  ON public.sicoob_delivery_receipt_events(idempotency_key);

CREATE INDEX IF NOT EXISTS idx_consolidation_orders_group ON public.order_consolidation_orders(consolidation_id);
CREATE INDEX IF NOT EXISTS idx_delivery_destinations_group ON public.sicoob_delivery_destinations(consolidation_id);
CREATE INDEX IF NOT EXISTS idx_delivery_allocations_destination ON public.sicoob_delivery_allocations(destination_id);
CREATE INDEX IF NOT EXISTS idx_delivery_receipts_allocation ON public.sicoob_delivery_receipt_events(allocation_id, received_at);

ALTER TABLE public.order_consolidation_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sicoob_delivery_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sicoob_delivery_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sicoob_delivery_receipt_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consolidation_orders_read_via_group" ON public.order_consolidation_orders
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.order_consolidations c WHERE c.id = consolidation_id)
);
CREATE POLICY "delivery_destinations_read_via_group" ON public.sicoob_delivery_destinations
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.order_consolidations c WHERE c.id = consolidation_id)
);
CREATE POLICY "delivery_allocations_read_via_destination" ON public.sicoob_delivery_allocations
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.sicoob_delivery_destinations d
    JOIN public.order_consolidations c ON c.id = d.consolidation_id
    WHERE d.id = destination_id
  )
);
CREATE POLICY "delivery_receipts_read_via_allocation" ON public.sicoob_delivery_receipt_events
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.sicoob_delivery_allocations a
    JOIN public.sicoob_delivery_destinations d ON d.id = a.destination_id
    JOIN public.order_consolidations c ON c.id = d.consolidation_id
    WHERE a.id = allocation_id
  )
);

CREATE OR REPLACE FUNCTION public.sicoob_actor_can_manage_consolidation(
  p_actor_id uuid,
  p_cooperative_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE (p.user_id = p_actor_id OR p.id = p_actor_id)
      AND p.is_active IS TRUE
      AND (p.deleted_at IS NULL)
      AND (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = p_actor_id AND ur.role::text IN ('dev', 'supervisor')
        )
        OR (
          p.cooperativa_id = p_cooperative_id
          AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = p_actor_id
              AND ur.role::text IN ('gestor_compras', 'comprador_singular')
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.sicoob_actor_can_receive_consolidation(
  p_actor_id uuid,
  p_consolidation_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.sicoob_delivery_destinations d ON d.pa_id = p.pa_id
    WHERE (p.user_id = p_actor_id OR p.id = p_actor_id)
      AND d.consolidation_id = p_consolidation_id
      AND p.is_active IS TRUE
      AND p.deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = p_actor_id
          AND ur.role::text IN ('gerente_pa', 'comprador_pac')
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.sicoob_actor_can_receive_destination(
  p_actor_id uuid,
  p_destination_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.sicoob_delivery_destinations d ON d.pa_id = p.pa_id
    WHERE (p.user_id = p_actor_id OR p.id = p_actor_id)
      AND d.id = p_destination_id
      AND p.is_active IS TRUE
      AND p.deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = p_actor_id
          AND ur.role::text IN ('gerente_pa', 'comprador_pac')
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.sicoob_actor_can_view_all_consolidation(
  p_actor_id uuid,
  p_consolidation_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.order_consolidations c
    WHERE c.id = p_consolidation_id
      AND (
        c.vendedor_id = p_actor_id
        OR public.sicoob_actor_can_manage_consolidation(p_actor_id, c.singular_id)
      )
  );
$$;

DROP POLICY IF EXISTS "Admins and Gestores can view consolidations" ON public.order_consolidations;
CREATE POLICY "consolidations_read_in_scope" ON public.order_consolidations
FOR SELECT TO authenticated USING (
  vendedor_id = auth.uid()
  OR public.sicoob_actor_can_manage_consolidation(auth.uid(), singular_id)
  OR public.sicoob_actor_can_receive_consolidation(auth.uid(), id)
);

DROP POLICY IF EXISTS "consolidation_orders_read_via_group" ON public.order_consolidation_orders;
CREATE POLICY "consolidation_orders_read_in_scope" ON public.order_consolidation_orders
FOR SELECT TO authenticated USING (
  public.sicoob_actor_can_view_all_consolidation(auth.uid(), consolidation_id)
);
DROP POLICY IF EXISTS "delivery_destinations_read_via_group" ON public.sicoob_delivery_destinations;
CREATE POLICY "delivery_destinations_read_in_scope" ON public.sicoob_delivery_destinations
FOR SELECT TO authenticated USING (
  public.sicoob_actor_can_view_all_consolidation(auth.uid(), consolidation_id)
  OR public.sicoob_actor_can_receive_destination(auth.uid(), id)
);
DROP POLICY IF EXISTS "delivery_allocations_read_via_destination" ON public.sicoob_delivery_allocations;
CREATE POLICY "delivery_allocations_read_in_scope" ON public.sicoob_delivery_allocations
FOR SELECT TO authenticated USING (
  public.sicoob_actor_can_receive_destination(auth.uid(), destination_id)
  OR EXISTS (
    SELECT 1 FROM public.sicoob_delivery_destinations d
    WHERE d.id = destination_id
      AND public.sicoob_actor_can_view_all_consolidation(auth.uid(), d.consolidation_id)
  )
);
DROP POLICY IF EXISTS "delivery_receipts_read_via_allocation" ON public.sicoob_delivery_receipt_events;
CREATE POLICY "delivery_receipts_read_in_scope" ON public.sicoob_delivery_receipt_events
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.sicoob_delivery_allocations a
    JOIN public.sicoob_delivery_destinations d ON d.id = a.destination_id
    WHERE a.id = allocation_id
      AND (
        public.sicoob_actor_can_receive_destination(auth.uid(), d.id)
        OR public.sicoob_actor_can_view_all_consolidation(auth.uid(), d.consolidation_id)
      )
  )
);

CREATE OR REPLACE FUNCTION public.get_sicoob_consolidation_sellers()
RETURNS TABLE (id uuid, name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_cooperative_id uuid;
BEGIN
  SELECT cooperativa_id INTO v_cooperative_id
  FROM public.profiles
  WHERE (user_id = v_actor_id OR id = v_actor_id)
    AND is_active IS TRUE
    AND deleted_at IS NULL
  LIMIT 1;
  IF v_actor_id IS NULL OR v_cooperative_id IS NULL
     OR NOT public.sicoob_actor_can_manage_consolidation(v_actor_id, v_cooperative_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Usuário fora do escopo da consolidação.';
  END IF;
  RETURN QUERY
  SELECT DISTINCT ur.user_id, COALESCE(NULLIF(trim(p.full_name), ''), ur.user_id::text)
  FROM public.user_roles ur
  LEFT JOIN public.profiles p ON p.user_id = ur.user_id OR p.id = ur.user_id
  WHERE ur.role::text = 'vendedor'
    AND p.cooperativa_id = v_cooperative_id
    AND p.is_active IS TRUE
    AND p.deleted_at IS NULL
  ORDER BY 2;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_sicoob_consolidation_records()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_operation text := current_setting('app.sicoob_consolidation_operation', true);
BEGIN
  IF TG_TABLE_NAME = 'sicoob_delivery_receipt_events' AND TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Eventos de recebimento são imutáveis.';
  END IF;
  IF COALESCE(v_operation, '') NOT IN ('create', 'allocate', 'dispatch', 'receive') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Consolidação só pode ser alterada pelo fluxo transacional.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER tr_protect_order_consolidations
BEFORE INSERT OR UPDATE OR DELETE ON public.order_consolidations
FOR EACH ROW EXECUTE FUNCTION public.protect_sicoob_consolidation_records();
CREATE TRIGGER tr_protect_consolidation_orders
BEFORE INSERT OR UPDATE OR DELETE ON public.order_consolidation_orders
FOR EACH ROW EXECUTE FUNCTION public.protect_sicoob_consolidation_records();
CREATE TRIGGER tr_protect_delivery_destinations
BEFORE INSERT OR UPDATE OR DELETE ON public.sicoob_delivery_destinations
FOR EACH ROW EXECUTE FUNCTION public.protect_sicoob_consolidation_records();
CREATE TRIGGER tr_protect_delivery_allocations
BEFORE INSERT OR UPDATE OR DELETE ON public.sicoob_delivery_allocations
FOR EACH ROW EXECUTE FUNCTION public.protect_sicoob_consolidation_records();
CREATE TRIGGER tr_protect_delivery_receipts
BEFORE INSERT OR UPDATE OR DELETE ON public.sicoob_delivery_receipt_events
FOR EACH ROW EXECUTE FUNCTION public.protect_sicoob_consolidation_records();

CREATE OR REPLACE FUNCTION public.protect_sicoob_order_consolidation_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.consolidation_id IS DISTINCT FROM OLD.consolidation_id
     AND current_setting('app.sicoob_consolidation_operation', true) IS DISTINCT FROM 'create' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O vínculo de consolidação exige o fluxo transacional.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_protect_sicoob_order_consolidation_link
BEFORE UPDATE OF consolidation_id ON public.sicoob_orders
FOR EACH ROW EXECUTE FUNCTION public.protect_sicoob_order_consolidation_link();

DROP FUNCTION IF EXISTS public.consolidate_pa_orders(uuid, uuid);

CREATE OR REPLACE FUNCTION public.create_sicoob_order_consolidation(
  p_order_ids uuid[],
  p_seller_id uuid,
  p_idempotency_key uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_consolidation_id uuid;
  v_existing_group public.order_consolidations%ROWTYPE;
  v_cooperative_id uuid;
  v_count integer;
  v_total numeric;
BEGIN
  IF v_actor_id IS NULL OR p_idempotency_key IS NULL OR cardinality(p_order_ids) = 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Pedidos, vendedor e chave de idempotência são obrigatórios.';
  END IF;
  IF cardinality(p_order_ids) <> (SELECT count(DISTINCT id) FROM unnest(p_order_ids) id) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A lista de pedidos contém duplicidades.';
  END IF;

  SELECT * INTO v_existing_group
    FROM public.order_consolidations WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing_group.consolidated_by IS DISTINCT FROM v_actor_id
       OR v_existing_group.vendedor_id IS DISTINCT FROM p_seller_id
       OR (SELECT count(*) FROM public.order_consolidation_orders co
            WHERE co.consolidation_id = v_existing_group.id) <> cardinality(p_order_ids)
       OR EXISTS (
         SELECT 1 FROM public.order_consolidation_orders co
          WHERE co.consolidation_id = v_existing_group.id
            AND NOT (co.order_id = ANY(p_order_ids))
       ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'A chave de idempotência já foi usada por outro usuário ou conteúdo.';
    END IF;
    RETURN v_existing_group.id;
  END IF;

  PERFORM 1 FROM public.sicoob_orders WHERE id = ANY(p_order_ids) FOR UPDATE;
  SELECT cooperative_id INTO v_cooperative_id
    FROM public.sicoob_orders
   WHERE id = ANY(p_order_ids)
   LIMIT 1;
  SELECT count(*), sum(total_amount)
    INTO v_count, v_total
    FROM public.sicoob_orders
   WHERE id = ANY(p_order_ids)
     AND cooperative_id IS NOT NULL
     AND pa_id IS NOT NULL
     AND status = 'confirmed'
     AND consolidation_id IS NULL
  ;
  IF v_count <> cardinality(p_order_ids)
     OR EXISTS (
       SELECT 1 FROM public.sicoob_orders
        WHERE id = ANY(p_order_ids) AND cooperative_id IS DISTINCT FROM v_cooperative_id
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Pedidos precisam estar confirmados, livres e na mesma Singular.';
  END IF;
  IF NOT public.sicoob_actor_can_manage_consolidation(v_actor_id, v_cooperative_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Usuário fora do escopo da consolidação.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE (p.user_id = p_seller_id OR p.id = p_seller_id)
      AND p.cooperativa_id = v_cooperative_id
      AND p.is_active IS TRUE
      AND p.deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = p_seller_id AND ur.role::text = 'vendedor'
      )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'Vendedor informado não possui vínculo ativo nesta Singular.';
  END IF;

  PERFORM set_config('app.sicoob_consolidation_operation', 'create', true);
  INSERT INTO public.order_consolidations (
    singular_id, vendedor_id, status, total_value, order_count, consolidated_by, idempotency_key
  ) VALUES (
    v_cooperative_id, p_seller_id, 'pending_seller', v_total, v_count, v_actor_id, p_idempotency_key
  ) RETURNING id INTO v_consolidation_id;

  INSERT INTO public.order_consolidation_orders (consolidation_id, order_id, order_total_snapshot)
  SELECT v_consolidation_id, id, total_amount
    FROM public.sicoob_orders WHERE id = ANY(p_order_ids);
  UPDATE public.sicoob_orders SET consolidation_id = v_consolidation_id
   WHERE id = ANY(p_order_ids);
  PERFORM public.allocate_sicoob_consolidation_by_order_pa(v_consolidation_id);
  RETURN v_consolidation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.allocate_sicoob_consolidation_by_order_pa(p_consolidation_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_group public.order_consolidations%ROWTYPE;
  v_count integer;
BEGIN
  SELECT * INTO v_group FROM public.order_consolidations
   WHERE id = p_consolidation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Consolidação não encontrada.'; END IF;
  IF v_group.status NOT IN ('draft', 'pending_seller') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Distribuição já despachada e não pode ser refeita.';
  END IF;
  IF NOT public.sicoob_actor_can_manage_consolidation(v_actor_id, v_group.singular_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Usuário fora do escopo da consolidação.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.order_consolidation_orders co
    JOIN public.sicoob_order_items oi ON oi.order_id = co.order_id
    WHERE co.consolidation_id = p_consolidation_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'A consolidação não possui itens para distribuir.';
  END IF;

  PERFORM set_config('app.sicoob_consolidation_operation', 'allocate', true);
  DELETE FROM public.sicoob_delivery_allocations a USING public.sicoob_delivery_destinations d
   WHERE a.destination_id = d.id AND d.consolidation_id = p_consolidation_id;
  DELETE FROM public.sicoob_delivery_destinations WHERE consolidation_id = p_consolidation_id;

  INSERT INTO public.sicoob_delivery_destinations (
    consolidation_id, pa_id, destination_name, address_snapshot
  )
  SELECT DISTINCT p_consolidation_id, pa.id, pa.nome,
    jsonb_build_object('codigo', pa.codigo, 'endereco', pa.endereco, 'cidade', pa.cidade, 'uf', pa.uf)
  FROM public.order_consolidation_orders co
  JOIN public.sicoob_orders o ON o.id = co.order_id
  JOIN public.postos_atendimento pa ON pa.id = o.pa_id
  WHERE co.consolidation_id = p_consolidation_id;

  INSERT INTO public.sicoob_delivery_allocations (destination_id, order_item_id, quantity)
  SELECT d.id, oi.id, oi.quantity
  FROM public.order_consolidation_orders co
  JOIN public.sicoob_orders o ON o.id = co.order_id
  JOIN public.sicoob_order_items oi ON oi.order_id = o.id
  JOIN public.sicoob_delivery_destinations d
    ON d.consolidation_id = p_consolidation_id AND d.pa_id = o.pa_id
  WHERE co.consolidation_id = p_consolidation_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.dispatch_sicoob_order_consolidation(p_consolidation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_group public.order_consolidations%ROWTYPE;
BEGIN
  SELECT * INTO v_group FROM public.order_consolidations
   WHERE id = p_consolidation_id FOR UPDATE;
  IF NOT FOUND OR v_group.status <> 'pending_seller' THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'A consolidação mudou; atualize a página.';
  END IF;
  IF NOT public.sicoob_actor_can_manage_consolidation(v_actor_id, v_group.singular_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Usuário fora do escopo da consolidação.';
  END IF;
  IF EXISTS (
    SELECT oi.id
    FROM public.order_consolidation_orders co
    JOIN public.sicoob_order_items oi ON oi.order_id = co.order_id
    LEFT JOIN (
      SELECT a.order_item_id, sum(a.quantity) AS allocated_quantity
      FROM public.sicoob_delivery_allocations a
      JOIN public.sicoob_delivery_destinations d ON d.id = a.destination_id
      WHERE d.consolidation_id = p_consolidation_id
      GROUP BY a.order_item_id
    ) allocated ON allocated.order_item_id = oi.id
    WHERE co.consolidation_id = p_consolidation_id
      AND COALESCE(allocated.allocated_quantity, 0) <> oi.quantity
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Todos os itens precisam de um destino antes do despacho.';
  END IF;
  PERFORM set_config('app.sicoob_consolidation_operation', 'dispatch', true);
  PERFORM set_config('app.sicoob_order_status_comment', 'Despachado no lote consolidado ' || p_consolidation_id::text || '.', true);
  UPDATE public.sicoob_orders o
     SET status = 'logistic', updated_at = now()
    FROM public.order_consolidation_orders co
   WHERE co.consolidation_id = p_consolidation_id
     AND co.order_id = o.id
     AND o.status = 'confirmed';
  IF NOT FOUND OR EXISTS (
    SELECT 1
      FROM public.order_consolidation_orders co
      JOIN public.sicoob_orders o ON o.id = co.order_id
     WHERE co.consolidation_id = p_consolidation_id
       AND o.status <> 'logistic'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Um pedido do lote mudou; atualize a página.';
  END IF;
  UPDATE public.order_consolidations SET status = 'sent', updated_at = now()
   WHERE id = p_consolidation_id;
END;
$$;

DROP FUNCTION IF EXISTS public.record_sicoob_delivery_receipt(uuid, integer, integer, integer, text);
CREATE OR REPLACE FUNCTION public.record_sicoob_delivery_receipt(
  p_allocation_id uuid,
  p_idempotency_key uuid,
  p_received_quantity integer DEFAULT 0,
  p_damaged_quantity integer DEFAULT 0,
  p_missing_quantity integer DEFAULT 0,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_allocation public.sicoob_delivery_allocations%ROWTYPE;
  v_group public.order_consolidations%ROWTYPE;
  v_event_id uuid;
  v_has_issues boolean;
  v_all_complete boolean;
  v_destination_pa_id uuid;
  v_existing_event public.sicoob_delivery_receipt_events%ROWTYPE;
BEGIN
  IF p_idempotency_key IS NULL
     OR p_received_quantity < 0 OR p_damaged_quantity < 0 OR p_missing_quantity < 0
     OR p_received_quantity + p_damaged_quantity + p_missing_quantity <= 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Informe ao menos uma quantidade positiva.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('sicoob-delivery-receipt:' || p_idempotency_key::text, 0));
  SELECT * INTO v_existing_event
    FROM public.sicoob_delivery_receipt_events
   WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing_event.allocation_id IS DISTINCT FROM p_allocation_id
       OR v_existing_event.received_quantity IS DISTINCT FROM p_received_quantity
       OR v_existing_event.damaged_quantity IS DISTINCT FROM p_damaged_quantity
       OR v_existing_event.missing_quantity IS DISTINCT FROM p_missing_quantity
       OR v_existing_event.notes IS DISTINCT FROM NULLIF(trim(p_notes), '')
       OR v_existing_event.received_by IS DISTINCT FROM v_actor_id THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A chave de idempotência já foi usada com outro recebimento.';
    END IF;
    RETURN v_existing_event.id;
  END IF;
  IF p_damaged_quantity + p_missing_quantity > 0
     AND length(trim(COALESCE(p_notes, ''))) < 10 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Descreva a divergência com ao menos 10 caracteres.';
  END IF;

  SELECT a.* INTO v_allocation
  FROM public.sicoob_delivery_allocations a WHERE a.id = p_allocation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Alocação não encontrada.'; END IF;
  SELECT c.* INTO v_group
  FROM public.sicoob_delivery_destinations d
  JOIN public.order_consolidations c ON c.id = d.consolidation_id
  WHERE d.id = v_allocation.destination_id FOR UPDATE OF c;
  SELECT pa_id INTO v_destination_pa_id
  FROM public.sicoob_delivery_destinations WHERE id = v_allocation.destination_id;
  IF v_group.status NOT IN ('sent', 'partially_received') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Recebimento permitido somente após o despacho.';
  END IF;
  IF NOT public.sicoob_actor_can_manage_consolidation(v_actor_id, v_group.singular_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.profiles p
       WHERE (p.user_id = v_actor_id OR p.id = v_actor_id)
         AND p.pa_id = v_destination_pa_id
         AND p.is_active IS TRUE
         AND p.deleted_at IS NULL
         AND EXISTS (
           SELECT 1 FROM public.user_roles ur
           WHERE ur.user_id = v_actor_id AND ur.role::text IN ('gerente_pa', 'comprador_pac')
         )
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Usuário fora do escopo da consolidação.';
  END IF;
  IF v_allocation.received_quantity + v_allocation.damaged_quantity + v_allocation.missing_quantity
     + p_received_quantity + p_damaged_quantity + p_missing_quantity > v_allocation.quantity THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O recebimento supera a quantidade destinada.';
  END IF;

  PERFORM set_config('app.sicoob_consolidation_operation', 'receive', true);
  INSERT INTO public.sicoob_delivery_receipt_events (
    idempotency_key, allocation_id, received_quantity, damaged_quantity, missing_quantity, notes, received_by
  ) VALUES (
    p_idempotency_key, p_allocation_id, p_received_quantity, p_damaged_quantity, p_missing_quantity,
    NULLIF(trim(p_notes), ''), v_actor_id
  ) RETURNING id INTO v_event_id;
  UPDATE public.sicoob_delivery_allocations SET
    received_quantity = received_quantity + p_received_quantity,
    damaged_quantity = damaged_quantity + p_damaged_quantity,
    missing_quantity = missing_quantity + p_missing_quantity,
    updated_at = now()
  WHERE id = p_allocation_id;

  SELECT bool_and(a.received_quantity + a.damaged_quantity + a.missing_quantity = a.quantity),
         bool_or(a.damaged_quantity > 0 OR a.missing_quantity > 0)
    INTO v_all_complete, v_has_issues
    FROM public.sicoob_delivery_allocations a
    JOIN public.sicoob_delivery_destinations d ON d.id = a.destination_id
   WHERE d.consolidation_id = v_group.id;
  UPDATE public.order_consolidations SET
    status = CASE
      WHEN v_all_complete AND v_has_issues THEN 'received_with_issues'
      WHEN v_all_complete THEN 'received'
      ELSE 'partially_received'
    END,
    received_at = CASE WHEN v_all_complete THEN now() ELSE NULL END,
    updated_at = now()
  WHERE id = v_group.id;
  -- Quantidades avariadas ou faltantes encerram a conferência física do lote,
  -- mas não caracterizam entrega concluída. O pedido permanece em logística
  -- até que a divergência seja resolvida pelo fluxo operacional.
  IF v_all_complete AND NOT v_has_issues THEN
    PERFORM set_config('app.sicoob_order_status_comment', 'Recebimento integral do lote consolidado ' || v_group.id::text || '.', true);
    UPDATE public.sicoob_orders o
       SET status = 'completed', updated_at = now()
      FROM public.order_consolidation_orders co
     WHERE co.consolidation_id = v_group.id
       AND co.order_id = o.id
       AND o.status = 'logistic';
    IF NOT FOUND OR EXISTS (
      SELECT 1
        FROM public.order_consolidation_orders co
        JOIN public.sicoob_orders o ON o.id = co.order_id
       WHERE co.consolidation_id = v_group.id
         AND o.status <> 'completed'
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Um pedido do lote mudou; atualize a página.';
    END IF;
  END IF;
  RETURN v_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.sicoob_actor_can_manage_consolidation(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sicoob_actor_can_receive_consolidation(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sicoob_actor_can_receive_destination(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sicoob_actor_can_view_all_consolidation(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_sicoob_consolidation_sellers() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_sicoob_consolidation_records() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_sicoob_order_consolidation_link() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_sicoob_order_consolidation(uuid[], uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.allocate_sicoob_consolidation_by_order_pa(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dispatch_sicoob_order_consolidation(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_sicoob_delivery_receipt(uuid, uuid, integer, integer, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_sicoob_order_consolidation(uuid[], uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sicoob_actor_can_manage_consolidation(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sicoob_actor_can_receive_consolidation(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sicoob_actor_can_receive_destination(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sicoob_actor_can_view_all_consolidation(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sicoob_consolidation_sellers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_sicoob_consolidation_by_order_pa(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_sicoob_order_consolidation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_sicoob_delivery_receipt(uuid, uuid, integer, integer, integer, text) TO authenticated;

-- ---- proxima migration ----

-- Converte uma composição do Kit Builder em orçamento local de forma atômica.
-- A Edge Function autenticada consulta preços, variantes, estoque e técnicas no
-- catálogo somente leitura. Esta RPC interna recebe o snapshot já verificado,
-- valida sua atualidade e persiste cabeçalho, itens e personalizações juntos.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.quote_item_personalizations
  ADD COLUMN IF NOT EXISTS catalog_checked_at timestamptz;

CREATE TABLE IF NOT EXISTS public.sicoob_kit_quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  idempotency_key text NOT NULL,
  payload_hash text NOT NULL,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (actor_id, idempotency_key),
  CHECK (length(idempotency_key) BETWEEN 8 AND 128),
  CHECK (length(payload_hash) = 64)
);

ALTER TABLE public.sicoob_kit_quote_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuário consulta conversões próprias de kit" ON public.sicoob_kit_quote_requests;
CREATE POLICY "Usuário consulta conversões próprias de kit"
ON public.sicoob_kit_quote_requests
FOR SELECT TO authenticated
USING (actor_id = auth.uid());

CREATE OR REPLACE FUNCTION public.create_sicoob_kit_quote(
  p_kit jsonb,
  p_items jsonb,
  p_personalizations jsonb,
  p_idempotency_key text,
  p_actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_existing public.sicoob_kit_quote_requests%ROWTYPE;
  v_item jsonb;
  v_personalization jsonb;
  v_quote_id uuid;
  v_quote_number text;
  v_quote_item_id uuid;
  v_group_id uuid := gen_random_uuid();
  v_sort_order integer := 0;
  v_product_total numeric(14,2) := 0;
  v_personalization_total numeric(14,2) := 0;
  v_total numeric(14,2);
  v_checked_at timestamptz;
  v_stable_items jsonb;
  v_stable_personalizations jsonb;
  v_payload_hash text;
  v_kit_name text := NULLIF(trim(p_kit ->> 'name'), '');
  v_kit_type text := NULLIF(trim(p_kit ->> 'type'), '');
  v_kit_quantity integer;
  v_identity_tag text := NULLIF(trim(p_kit ->> 'identity_tag'), '');
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Autenticação necessária para criar o orçamento.';
  END IF;
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) NOT BETWEEN 8 AND 128 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Chave de idempotência inválida.';
  END IF;
  IF jsonb_typeof(p_kit) IS DISTINCT FROM 'object'
     OR v_kit_name IS NULL OR length(v_kit_name) > 120
     OR v_kit_type NOT IN ('montado', 'original', 'simples')
     OR COALESCE(length(v_identity_tag), 0) > 60 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Identificação do kit inválida.';
  END IF;

  BEGIN
    v_kit_quantity := (p_kit ->> 'quantity')::integer;
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Quantidade de kits inválida.';
  END;
  IF v_kit_quantity IS NULL OR v_kit_quantity NOT BETWEEN 1 AND 100000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A quantidade de kits deve estar entre 1 e 100.000.';
  END IF;

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_items) NOT BETWEEN 2 AND 50
     OR jsonb_typeof(p_personalizations) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_personalizations) > jsonb_array_length(p_items) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Composição do kit inválida.';
  END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(p_items) source(item) WHERE item ->> 'kind' = 'box') <> 1
     OR jsonb_array_length(p_items) <> (
       SELECT count(DISTINCT item ->> 'line_id')::integer FROM jsonb_array_elements(p_items) source(item)
     )
     OR jsonb_array_length(p_personalizations) <> (
       SELECT count(DISTINCT item ->> 'line_id')::integer FROM jsonb_array_elements(p_personalizations) source(item)
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Linhas de kit duplicadas ou embalagem inválida.';
  END IF;

  SELECT * INTO v_profile
    FROM public.profiles
   WHERE user_id = p_actor_id
     AND is_active IS TRUE
     AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O usuário não possui perfil ativo.';
  END IF;

  SELECT jsonb_agg(item - 'catalog_checked_at' ORDER BY item ->> 'line_id')
    INTO v_stable_items
    FROM jsonb_array_elements(p_items) source(item);
  SELECT COALESCE(jsonb_agg(item - 'catalog_checked_at' ORDER BY item ->> 'line_id'), '[]'::jsonb)
    INTO v_stable_personalizations
    FROM jsonb_array_elements(p_personalizations) source(item);
  v_payload_hash := encode(digest(
    jsonb_build_object(
      'kit', p_kit,
      'items', v_stable_items,
      'personalizations', v_stable_personalizations
    )::text,
    'sha256'
  ), 'hex');

  PERFORM pg_advisory_xact_lock(hashtextextended(p_actor_id::text || ':' || trim(p_idempotency_key), 0));
  SELECT * INTO v_existing
    FROM public.sicoob_kit_quote_requests
   WHERE actor_id = p_actor_id
     AND idempotency_key = trim(p_idempotency_key);
  IF FOUND THEN
    IF v_existing.payload_hash IS DISTINCT FROM v_payload_hash THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A chave de idempotência já foi usada com conteúdo diferente.';
    END IF;
    SELECT quote_number, total INTO v_quote_number, v_total
      FROM public.quotes WHERE id = v_existing.quote_id;
    RETURN jsonb_build_object('quote_id', v_existing.quote_id, 'quote_number', v_quote_number, 'total', v_total);
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    IF COALESCE(length(v_item ->> 'line_id'), 0) NOT BETWEEN 1 AND 64
       OR v_item ->> 'kind' NOT IN ('box', 'item')
       OR NULLIF(v_item ->> 'product_id', '') IS NULL
       OR NULLIF(trim(v_item ->> 'product_name'), '') IS NULL
       OR COALESCE((v_item ->> 'quantity')::integer, 0) <= 0
       OR COALESCE((v_item ->> 'unit_price')::numeric, 0) <= 0
       OR COALESCE((v_item ->> 'minimum_quantity')::integer, 1) <= 0 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Item verificado do kit inválido.';
    END IF;

    v_checked_at := NULLIF(v_item ->> 'catalog_checked_at', '')::timestamptz;
    IF v_checked_at IS NULL
       OR v_checked_at < now() - interval '5 minutes'
       OR v_checked_at > now() + interval '1 minute' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Preço e estoque precisam ser consultados novamente.';
    END IF;
    v_product_total := v_product_total
      + ((v_item ->> 'quantity')::integer * (v_item ->> 'unit_price')::numeric);
  END LOOP;

  -- MOQ é uma regra do produto, portanto duas linhas/variantes do mesmo produto
  -- devem ser avaliadas pela demanda total. Também recusamos snapshots que
  -- atribuam mínimos divergentes ao mesmo produto.
  IF EXISTS (
    SELECT 1
      FROM (
        SELECT item ->> 'product_id' AS product_id,
               sum((item ->> 'quantity')::integer) AS total_quantity,
               min(COALESCE((item ->> 'minimum_quantity')::integer, 1)) AS minimum_quantity,
               max(COALESCE((item ->> 'minimum_quantity')::integer, 1)) AS maximum_quantity
          FROM jsonb_array_elements(p_items) source(item)
         GROUP BY item ->> 'product_id'
      ) demand
     WHERE demand.minimum_quantity IS DISTINCT FROM demand.maximum_quantity
        OR demand.total_quantity < demand.minimum_quantity
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Quantidade abaixo do mínimo vigente do produto.';
  END IF;

  FOR v_personalization IN SELECT value FROM jsonb_array_elements(p_personalizations)
  LOOP
    IF NOT EXISTS (
         SELECT 1 FROM jsonb_array_elements(p_items) source(item)
          WHERE item ->> 'line_id' = v_personalization ->> 'line_id'
       )
       OR NULLIF(v_personalization ->> 'technique_id', '') IS NULL
       OR NULLIF(trim(v_personalization ->> 'technique_name'), '') IS NULL
       OR COALESCE((v_personalization ->> 'colors_count')::integer, 0) <= 0
       OR COALESCE((v_personalization ->> 'personalized_quantity')::integer, 0) <= 0
       OR COALESCE((v_personalization ->> 'unit_cost')::numeric, 0) <= 0
       OR COALESCE((v_personalization ->> 'setup_cost')::numeric, 0) < 0
       OR COALESCE((v_personalization ->> 'total_cost')::numeric, 0) <= 0 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Personalização verificada do kit inválida.';
    END IF;
    IF (v_personalization ->> 'personalized_quantity')::integer IS DISTINCT FROM (
         SELECT (item ->> 'quantity')::integer
           FROM jsonb_array_elements(p_items) source(item)
          WHERE item ->> 'line_id' = v_personalization ->> 'line_id'
       ) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A personalização não corresponde à quantidade do item.';
    END IF;

    v_checked_at := NULLIF(v_personalization ->> 'catalog_checked_at', '')::timestamptz;
    IF v_checked_at IS NULL
       OR v_checked_at < now() - interval '5 minutes'
       OR v_checked_at > now() + interval '1 minute' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'O preço da personalização precisa ser consultado novamente.';
    END IF;
    v_personalization_total := v_personalization_total + (v_personalization ->> 'total_cost')::numeric;
  END LOOP;

  v_total := round(v_product_total + v_personalization_total, 2);
  INSERT INTO public.quotes (
    client_id, client_name, seller_id, status, subtotal, total, notes,
    internal_notes, organization_id, pa_id, singular_id
  ) VALUES (
    NULL,
    'Unidade Sicoob',
    p_actor_id,
    'draft',
    v_total,
    v_total,
    format('Kit "%s" (%sx) — tipo: %s. Catálogo consultado na criação; estoque não reservado.',
      v_kit_name, v_kit_quantity, v_kit_type),
    CASE WHEN v_identity_tag IS NOT NULL THEN format('Identidade do kit: %s', v_identity_tag) ELSE NULL END,
    v_profile.organization_id,
    v_profile.pa_id,
    v_profile.cooperativa_id
  ) RETURNING id, quote_number INTO v_quote_id, v_quote_number;

  FOR v_item IN
    SELECT value
      FROM jsonb_array_elements(p_items)
     ORDER BY CASE WHEN value ->> 'kind' = 'box' THEN 0 ELSE 1 END, value ->> 'line_id'
  LOOP
    INSERT INTO public.quote_items (
      quote_id, product_id, product_name, product_sku, product_image_url,
      quantity, unit_price, color_name, color_hex, size_code, notes, sort_order,
      kit_group_id, kit_name, source_variant_id, source_variant_sku, catalog_checked_at
    ) VALUES (
      v_quote_id,
      v_item ->> 'product_id',
      v_item ->> 'product_name',
      NULLIF(v_item ->> 'product_sku', ''),
      NULLIF(v_item ->> 'product_image_url', ''),
      (v_item ->> 'quantity')::integer,
      (v_item ->> 'unit_price')::numeric,
      NULLIF(v_item ->> 'color_name', ''),
      NULLIF(v_item ->> 'color_hex', ''),
      NULLIF(v_item ->> 'size_code', ''),
      CASE WHEN v_item ->> 'kind' = 'box' THEN 'Embalagem do kit' ELSE NULL END,
      v_sort_order,
      v_group_id::text,
      v_kit_name,
      NULLIF(v_item ->> 'source_variant_id', ''),
      NULLIF(v_item ->> 'source_variant_sku', ''),
      (v_item ->> 'catalog_checked_at')::timestamptz
    ) RETURNING id INTO v_quote_item_id;

    SELECT value INTO v_personalization
      FROM jsonb_array_elements(p_personalizations)
     WHERE value ->> 'line_id' = v_item ->> 'line_id';
    IF FOUND THEN
      INSERT INTO public.quote_item_personalizations (
        quote_item_id, technique_id, technique_name, colors_count,
        width_cm, height_cm, personalized_quantity, unit_cost,
        setup_cost, total_cost, notes, catalog_checked_at
      ) VALUES (
        v_quote_item_id,
        v_personalization ->> 'technique_id',
        v_personalization ->> 'technique_name',
        (v_personalization ->> 'colors_count')::integer,
        NULLIF(v_personalization ->> 'width_cm', '')::numeric,
        NULLIF(v_personalization ->> 'height_cm', '')::numeric,
        (v_personalization ->> 'personalized_quantity')::integer,
        (v_personalization ->> 'unit_cost')::numeric,
        (v_personalization ->> 'setup_cost')::numeric,
        (v_personalization ->> 'total_cost')::numeric,
        CASE WHEN NULLIF(v_personalization ->> 'position', '') IS NOT NULL
          THEN format('Posição: %s', v_personalization ->> 'position') ELSE NULL END,
        (v_personalization ->> 'catalog_checked_at')::timestamptz
      );
    END IF;
    v_sort_order := v_sort_order + 1;
  END LOOP;

  INSERT INTO public.sicoob_kit_quote_requests (
    actor_id, idempotency_key, payload_hash, quote_id
  ) VALUES (
    p_actor_id, trim(p_idempotency_key), v_payload_hash, v_quote_id
  );

  RETURN jsonb_build_object('quote_id', v_quote_id, 'quote_number', v_quote_number, 'total', v_total);
END;
$$;

REVOKE ALL ON FUNCTION public.create_sicoob_kit_quote(jsonb, jsonb, jsonb, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_sicoob_kit_quote(jsonb, jsonb, jsonb, text, uuid) TO service_role;

COMMENT ON FUNCTION public.create_sicoob_kit_quote(jsonb, jsonb, jsonb, text, uuid) IS
  'RPC interna: persiste orçamento de kit atômico e idempotente após revalidação do catálogo pela Edge Function.';

-- ---- proxima migration (follow-up) ----

-- Follow-up de 20260912170000_sicoob_reorder_atomic.sql
--
-- Complementa uma migration já mesclada em main (pode já ter rodado em
-- produção) sem editá-la — ver docs/correcoes-validacao-2026-09-13.md.


ALTER TABLE public.quote_item_personalizations
  ADD COLUMN IF NOT EXISTS catalog_checked_at timestamptz;


CREATE OR REPLACE FUNCTION public.get_sicoob_reorder_idempotency(
  p_actor_id uuid,
  p_order_id uuid,
  p_idempotency_key text,
  p_request_hash text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.sicoob_reorder_requests%ROWTYPE;
BEGIN
  IF p_actor_id IS NULL OR p_order_id IS NULL
     OR length(trim(COALESCE(p_idempotency_key, ''))) NOT BETWEEN 8 AND 128
     OR COALESCE(p_request_hash, '') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Identidade da requisição de recompra inválida.';
  END IF;
  SELECT * INTO v_existing
    FROM public.sicoob_reorder_requests
   WHERE actor_id = p_actor_id
     AND source_order_id = p_order_id
     AND idempotency_key = trim(p_idempotency_key);
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF v_existing.payload_hash IS DISTINCT FROM p_request_hash THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A chave de idempotência já foi usada com conteúdo diferente.';
  END IF;
  RETURN v_existing.quote_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_sicoob_reorder_idempotency(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sicoob_reorder_idempotency(uuid, uuid, text, text) TO service_role;

DROP FUNCTION IF EXISTS public.reorder_sicoob_order_as_quote(uuid, jsonb, text, uuid);

CREATE OR REPLACE FUNCTION public.reorder_sicoob_order_as_quote(
  p_order_id uuid,
  p_items jsonb,
  p_idempotency_key text,
  p_actor_id uuid,
  p_request_hash text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := p_actor_id;
  v_order public.sicoob_orders%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_existing public.sicoob_reorder_requests%ROWTYPE;
  v_item jsonb;
  v_personalization jsonb;
  v_source_item public.sicoob_order_items%ROWTYPE;
  v_payload_hash text;
  v_quote_id uuid;
  v_quote_item_id uuid;
  v_sort_order integer := 0;
  v_total numeric(14,2) := 0;
  v_checked_at timestamptz;
  v_pa_name text;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Autenticação necessária para refazer o pedido.';
  END IF;

  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) NOT BETWEEN 8 AND 128 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Chave de idempotência inválida.';
  END IF;
  IF COALESCE(p_request_hash, '') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Identidade da requisição de recompra inválida.';
  END IF;

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_items) = 0
     OR jsonb_array_length(p_items) > 100 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A recompra deve conter entre 1 e 100 itens.';
  END IF;

  SELECT * INTO v_order
    FROM public.sicoob_orders
   WHERE id = p_order_id
   FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Pedido de origem não encontrado.';
  END IF;
  IF v_order.status IS DISTINCT FROM 'completed' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Somente pedidos concluídos podem ser refeitos.';
  END IF;

  IF jsonb_array_length(p_items) IS DISTINCT FROM (
       SELECT count(*)::integer FROM public.sicoob_order_items WHERE order_id = v_order.id
     )
     OR jsonb_array_length(p_items) IS DISTINCT FROM (
       SELECT count(DISTINCT item ->> 'source_order_item_id')::integer
         FROM jsonb_array_elements(p_items) AS source(item)
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A recompra deve representar cada item do pedido uma única vez.';
  END IF;

  SELECT * INTO v_profile
    FROM public.profiles
   WHERE user_id = v_actor_id
     AND is_active IS TRUE
     AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O usuário não possui perfil ativo.';
  END IF;

  IF v_order.created_by IS DISTINCT FROM v_actor_id
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = v_actor_id
          AND ur.role::text IN ('admin', 'dev', 'supervisor')
     )
     AND NOT (
       v_profile.pa_id IS NOT NULL
       AND v_profile.pa_id = v_order.pa_id
       AND EXISTS (
         SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = v_actor_id
            AND ur.role::text IN ('gerente_pa', 'comprador_pac', 'gestor_compras')
       )
     )
     AND NOT (
       v_profile.cooperativa_id IS NOT NULL
       AND v_profile.cooperativa_id = v_order.cooperative_id
       AND EXISTS (
         SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = v_actor_id
            AND ur.role::text IN ('comprador_singular', 'gestor_compras')
       )
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Você não pode refazer este pedido.';
  END IF;

  v_payload_hash := p_request_hash;
  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_actor_id::text || ':' || p_order_id::text || ':' || trim(p_idempotency_key), 0)
  );

  SELECT * INTO v_existing
    FROM public.sicoob_reorder_requests
   WHERE actor_id = v_actor_id
     AND source_order_id = p_order_id
     AND idempotency_key = trim(p_idempotency_key);
  IF FOUND THEN
    IF v_existing.payload_hash IS DISTINCT FROM v_payload_hash THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A chave de idempotência já foi usada com conteúdo diferente.';
    END IF;
    RETURN v_existing.quote_id;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    IF NULLIF(v_item ->> 'source_order_item_id', '') IS NULL
       OR NULLIF(v_item ->> 'product_id', '') IS NULL
       OR NULLIF(trim(v_item ->> 'product_name'), '') IS NULL
       OR COALESCE((v_item ->> 'quantity')::integer, 0) <= 0
       OR COALESCE((v_item ->> 'unit_price')::numeric, 0) <= 0 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Item de recompra inválido.';
    END IF;

    SELECT * INTO v_source_item
      FROM public.sicoob_order_items
     WHERE id = (v_item ->> 'source_order_item_id')::uuid
       AND order_id = v_order.id;
    IF NOT FOUND
       OR v_source_item.product_id::text IS DISTINCT FROM (v_item ->> 'product_id')
       OR v_source_item.quantity IS DISTINCT FROM (v_item ->> 'quantity')::integer THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'O item não corresponde ao pedido de origem.';
    END IF;

    v_checked_at := NULLIF(v_item ->> 'catalog_checked_at', '')::timestamptz;
    IF v_checked_at IS NULL
       OR v_checked_at < now() - interval '5 minutes'
       OR v_checked_at > now() + interval '1 minute' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Preço e estoque precisam ser consultados novamente.';
    END IF;

    IF COALESCE((v_item ->> 'minimum_quantity')::integer, 1) > (v_item ->> 'quantity')::integer THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Quantidade abaixo do mínimo vigente do produto.';
    END IF;

    IF NULLIF(v_source_item.variant_id, '') IS NOT NULL
       AND v_source_item.variant_id IS DISTINCT FROM NULLIF(v_item ->> 'source_variant_id', '') THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A variante não corresponde ao pedido de origem.';
    END IF;

    v_total := v_total + ((v_item ->> 'quantity')::integer * (v_item ->> 'unit_price')::numeric);
    IF jsonb_typeof(COALESCE(v_item -> 'personalizations', '[]'::jsonb)) IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Personalização revalidada inválida.';
    END IF;
    FOR v_personalization IN
      SELECT value FROM jsonb_array_elements(COALESCE(v_item -> 'personalizations', '[]'::jsonb))
    LOOP
      IF NULLIF(v_personalization ->> 'technique_id', '') IS NULL
         OR NULLIF(trim(v_personalization ->> 'technique_name'), '') IS NULL
         OR COALESCE((v_personalization ->> 'colors_count')::integer, 0) <= 0
         OR (v_personalization ->> 'personalized_quantity')::integer IS DISTINCT FROM (v_item ->> 'quantity')::integer
         OR COALESCE((v_personalization ->> 'unit_cost')::numeric, 0) <= 0
         OR COALESCE((v_personalization ->> 'setup_cost')::numeric, 0) < 0
         OR COALESCE((v_personalization ->> 'total_cost')::numeric, 0) <= 0 THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Personalização revalidada inválida.';
      END IF;
      v_checked_at := NULLIF(v_personalization ->> 'catalog_checked_at', '')::timestamptz;
      IF v_checked_at IS NULL
         OR v_checked_at < now() - interval '5 minutes'
         OR v_checked_at > now() + interval '1 minute' THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'O preço da personalização precisa ser consultado novamente.';
      END IF;
      v_total := v_total + (v_personalization ->> 'total_cost')::numeric;
    END LOOP;
  END LOOP;

  SELECT nome INTO v_pa_name
    FROM public.postos_atendimento
   WHERE id = v_order.pa_id;

  PERFORM set_config('app.sicoob_reorder_operation', 'create', true);
  INSERT INTO public.quotes (
    client_id, client_name, seller_id, status, subtotal, total, notes,
    organization_id, pa_id, singular_id
  ) VALUES (
    NULL,
    COALESCE(v_pa_name, 'Unidade Sicoob'),
    v_actor_id,
    'draft',
    v_total,
    v_total,
    format('Recompra do pedido Sicoob #%s. Preço e estoque revalidados antes da criação.', COALESCE(v_order.id::text, '')),
    v_profile.organization_id,
    v_order.pa_id,
    v_order.cooperative_id
  )
  RETURNING id INTO v_quote_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.quote_items (
      quote_id, product_id, product_name, product_sku, product_image_url,
      quantity, unit_price, color_name, color_hex, size_code,
      source_variant_id, source_variant_sku, catalog_checked_at, sort_order
    ) VALUES (
      v_quote_id,
      v_item ->> 'product_id',
      v_item ->> 'product_name',
      NULLIF(v_item ->> 'product_sku', ''),
      NULLIF(v_item ->> 'product_image_url', ''),
      (v_item ->> 'quantity')::integer,
      (v_item ->> 'unit_price')::numeric,
      NULLIF(v_item ->> 'color_name', ''),
      NULLIF(v_item ->> 'color_hex', ''),
      NULLIF(v_item ->> 'size_code', ''),
      NULLIF(v_item ->> 'source_variant_id', ''),
      NULLIF(v_item ->> 'source_variant_sku', ''),
      (v_item ->> 'catalog_checked_at')::timestamptz,
      v_sort_order
    ) RETURNING id INTO v_quote_item_id;

    FOR v_personalization IN
      SELECT value FROM jsonb_array_elements(COALESCE(v_item -> 'personalizations', '[]'::jsonb))
    LOOP
      INSERT INTO public.quote_item_personalizations (
        quote_item_id, technique_id, technique_name, colors_count,
        width_cm, height_cm, personalized_quantity, unit_cost,
        setup_cost, total_cost, notes, catalog_checked_at
      ) VALUES (
        v_quote_item_id,
        v_personalization ->> 'technique_id',
        v_personalization ->> 'technique_name',
        (v_personalization ->> 'colors_count')::integer,
        NULLIF(v_personalization ->> 'width_cm', '')::numeric,
        NULLIF(v_personalization ->> 'height_cm', '')::numeric,
        (v_personalization ->> 'personalized_quantity')::integer,
        (v_personalization ->> 'unit_cost')::numeric,
        (v_personalization ->> 'setup_cost')::numeric,
        (v_personalization ->> 'total_cost')::numeric,
        concat_ws(' ',
          CASE WHEN NULLIF(v_personalization ->> 'position', '') IS NOT NULL
            THEN format('Posição: %s.', v_personalization ->> 'position') END,
          'Arte precisa ser reenviada e aprovada para esta recompra.'
        ),
        (v_personalization ->> 'catalog_checked_at')::timestamptz
      );
    END LOOP;
    v_sort_order := v_sort_order + 1;
  END LOOP;

  INSERT INTO public.sicoob_reorder_requests (
    actor_id, source_order_id, idempotency_key, payload_hash, quote_id
  ) VALUES (
    v_actor_id, p_order_id, trim(p_idempotency_key), v_payload_hash, v_quote_id
  );

  RETURN v_quote_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_sicoob_order_as_quote(uuid, jsonb, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_sicoob_order_as_quote(uuid, jsonb, text, uuid, text) TO service_role;

COMMENT ON FUNCTION public.reorder_sicoob_order_as_quote(uuid, jsonb, text, uuid, text) IS
  'RPC interna: cria orçamento de recompra atômico com catálogo revalidado pela Edge Function.';

-- ---- proxima migration (follow-up) ----

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


-- ---- proxima migration (follow-up) ----

-- Follow-up de 20260912190000_sicoob_consolidation_distribution.sql
--
-- Complementa uma migration já mesclada em main (pode já ter rodado em
-- produção) sem editá-la — ver docs/correcoes-validacao-2026-09-13.md.


CREATE OR REPLACE FUNCTION public.allocate_sicoob_consolidation_by_order_pa(p_consolidation_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_group public.order_consolidations%ROWTYPE;
  v_count integer;
BEGIN
  SELECT * INTO v_group FROM public.order_consolidations
   WHERE id = p_consolidation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Consolidação não encontrada.'; END IF;
  IF v_group.status NOT IN ('draft', 'pending_seller') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Distribuição já despachada e não pode ser refeita.';
  END IF;
  IF NOT public.sicoob_actor_can_manage_consolidation(v_actor_id, v_group.singular_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Usuário fora do escopo da consolidação.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.order_consolidation_orders co
    JOIN public.sicoob_order_items oi ON oi.order_id = co.order_id
    WHERE co.consolidation_id = p_consolidation_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'A consolidação não possui itens para distribuir.';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM public.order_consolidation_orders co
      JOIN public.sicoob_orders o ON o.id = co.order_id
      LEFT JOIN public.postos_atendimento pa ON pa.id = o.pa_id
     WHERE co.consolidation_id = p_consolidation_id
       AND (
         pa.id IS NULL
         OR pa.is_active IS DISTINCT FROM true
         OR NULLIF(trim(pa.endereco), '') IS NULL
         OR NULLIF(trim(pa.cidade), '') IS NULL
         OR NULLIF(trim(pa.uf), '') IS NULL
       )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Todos os destinos precisam estar ativos e com endereço completo.';
  END IF;

  PERFORM set_config('app.sicoob_consolidation_operation', 'allocate', true);
  DELETE FROM public.sicoob_delivery_allocations a USING public.sicoob_delivery_destinations d
   WHERE a.destination_id = d.id AND d.consolidation_id = p_consolidation_id;
  DELETE FROM public.sicoob_delivery_destinations WHERE consolidation_id = p_consolidation_id;

  INSERT INTO public.sicoob_delivery_destinations (
    consolidation_id, pa_id, destination_name, address_snapshot
  )
  SELECT DISTINCT p_consolidation_id, pa.id, pa.nome,
    jsonb_build_object('codigo', pa.codigo, 'endereco', pa.endereco, 'cidade', pa.cidade, 'uf', pa.uf)
  FROM public.order_consolidation_orders co
  JOIN public.sicoob_orders o ON o.id = co.order_id
  JOIN public.postos_atendimento pa ON pa.id = o.pa_id
  WHERE co.consolidation_id = p_consolidation_id;

  INSERT INTO public.sicoob_delivery_allocations (destination_id, order_item_id, quantity)
  SELECT d.id, oi.id, oi.quantity
  FROM public.order_consolidation_orders co
  JOIN public.sicoob_orders o ON o.id = co.order_id
  JOIN public.sicoob_order_items oi ON oi.order_id = o.id
  JOIN public.sicoob_delivery_destinations d
    ON d.consolidation_id = p_consolidation_id AND d.pa_id = o.pa_id
  WHERE co.consolidation_id = p_consolidation_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


CREATE OR REPLACE FUNCTION public.dispatch_sicoob_order_consolidation(p_consolidation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_group public.order_consolidations%ROWTYPE;
BEGIN
  SELECT * INTO v_group FROM public.order_consolidations
   WHERE id = p_consolidation_id FOR UPDATE;
  IF NOT FOUND OR v_group.status <> 'pending_seller' THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'A consolidação mudou; atualize a página.';
  END IF;
  IF NOT public.sicoob_actor_can_manage_consolidation(v_actor_id, v_group.singular_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Usuário fora do escopo da consolidação.';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM public.sicoob_delivery_destinations d
      LEFT JOIN public.postos_atendimento pa ON pa.id = d.pa_id
     WHERE d.consolidation_id = p_consolidation_id
       AND (
         pa.id IS NULL
         OR pa.is_active IS DISTINCT FROM true
         OR NULLIF(trim(pa.endereco), '') IS NULL
         OR NULLIF(trim(pa.cidade), '') IS NULL
         OR NULLIF(trim(pa.uf), '') IS NULL
       )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Todos os destinos precisam permanecer ativos e com endereço completo antes do despacho.';
  END IF;
  IF EXISTS (
    SELECT oi.id
    FROM public.order_consolidation_orders co
    JOIN public.sicoob_order_items oi ON oi.order_id = co.order_id
    LEFT JOIN (
      SELECT a.order_item_id, sum(a.quantity) AS allocated_quantity
      FROM public.sicoob_delivery_allocations a
      JOIN public.sicoob_delivery_destinations d ON d.id = a.destination_id
      WHERE d.consolidation_id = p_consolidation_id
      GROUP BY a.order_item_id
    ) allocated ON allocated.order_item_id = oi.id
    WHERE co.consolidation_id = p_consolidation_id
      AND COALESCE(allocated.allocated_quantity, 0) <> oi.quantity
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Todos os itens precisam de um destino antes do despacho.';
  END IF;
  PERFORM set_config('app.sicoob_consolidation_operation', 'dispatch', true);
  PERFORM set_config('app.sicoob_order_status_comment', 'Despachado no lote consolidado ' || p_consolidation_id::text || '.', true);
  UPDATE public.sicoob_orders o
     SET status = 'logistic', updated_at = now()
    FROM public.order_consolidation_orders co
   WHERE co.consolidation_id = p_consolidation_id
     AND co.order_id = o.id
     AND o.status = 'confirmed';
  IF NOT FOUND OR EXISTS (
    SELECT 1
      FROM public.order_consolidation_orders co
      JOIN public.sicoob_orders o ON o.id = co.order_id
     WHERE co.consolidation_id = p_consolidation_id
       AND o.status <> 'logistic'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Um pedido do lote mudou; atualize a página.';
  END IF;
  UPDATE public.order_consolidations SET status = 'sent', updated_at = now()
   WHERE id = p_consolidation_id;
END;
$$;

-- ---- proxima migration (follow-up) ----

-- Follow-up de 20260912200000_sicoob_kit_quote_atomic.sql
--
-- Complementa uma migration já mesclada em main (pode já ter rodado em
-- produção) sem editá-la — ver docs/correcoes-validacao-2026-09-13.md.


CREATE OR REPLACE FUNCTION public.get_sicoob_kit_quote_idempotency(
  p_actor_id uuid,
  p_idempotency_key text,
  p_request_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing public.sicoob_kit_quote_requests%ROWTYPE;
  v_quote_number text;
  v_total numeric(14,2);
BEGIN
  IF p_actor_id IS NULL
     OR length(trim(COALESCE(p_idempotency_key, ''))) NOT BETWEEN 8 AND 128
     OR COALESCE(p_request_hash, '') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Identidade da requisição de kit inválida.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
     WHERE user_id = p_actor_id AND is_active IS TRUE AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O usuário não possui perfil ativo.';
  END IF;

  SELECT * INTO v_existing
    FROM public.sicoob_kit_quote_requests
   WHERE actor_id = p_actor_id AND idempotency_key = trim(p_idempotency_key);
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF v_existing.payload_hash IS DISTINCT FROM p_request_hash THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A chave de idempotência já foi usada com conteúdo diferente.';
  END IF;
  SELECT quote_number, total INTO v_quote_number, v_total
    FROM public.quotes WHERE id = v_existing.quote_id;
  RETURN jsonb_build_object(
    'quote_id', v_existing.quote_id,
    'quote_number', v_quote_number,
    'total', v_total
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_sicoob_kit_quote_idempotency(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sicoob_kit_quote_idempotency(uuid, text, text) TO service_role;

DROP FUNCTION IF EXISTS public.create_sicoob_kit_quote(jsonb, jsonb, jsonb, text, uuid);

CREATE OR REPLACE FUNCTION public.create_sicoob_kit_quote(
  p_kit jsonb,
  p_items jsonb,
  p_personalizations jsonb,
  p_idempotency_key text,
  p_actor_id uuid,
  p_request_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_existing public.sicoob_kit_quote_requests%ROWTYPE;
  v_item jsonb;
  v_personalization jsonb;
  v_quote_id uuid;
  v_quote_number text;
  v_quote_item_id uuid;
  v_group_id uuid := gen_random_uuid();
  v_sort_order integer := 0;
  v_product_total numeric(14,2) := 0;
  v_personalization_total numeric(14,2) := 0;
  v_total numeric(14,2);
  v_checked_at timestamptz;
  v_payload_hash text;
  v_kit_name text := NULLIF(trim(p_kit ->> 'name'), '');
  v_kit_type text := NULLIF(trim(p_kit ->> 'type'), '');
  v_kit_quantity integer;
  v_identity_tag text := NULLIF(trim(p_kit ->> 'identity_tag'), '');
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Autenticação necessária para criar o orçamento.';
  END IF;
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) NOT BETWEEN 8 AND 128 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Chave de idempotência inválida.';
  END IF;
  IF COALESCE(p_request_hash, '') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Identidade da requisição de kit inválida.';
  END IF;
  IF jsonb_typeof(p_kit) IS DISTINCT FROM 'object'
     OR v_kit_name IS NULL OR length(v_kit_name) > 120
     OR v_kit_type NOT IN ('montado', 'original', 'simples')
     OR COALESCE(length(v_identity_tag), 0) > 60 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Identificação do kit inválida.';
  END IF;

  BEGIN
    v_kit_quantity := (p_kit ->> 'quantity')::integer;
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Quantidade de kits inválida.';
  END;
  IF v_kit_quantity IS NULL OR v_kit_quantity NOT BETWEEN 1 AND 100000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A quantidade de kits deve estar entre 1 e 100.000.';
  END IF;

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_items) NOT BETWEEN 2 AND 50
     OR jsonb_typeof(p_personalizations) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_personalizations) > jsonb_array_length(p_items) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Composição do kit inválida.';
  END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(p_items) source(item) WHERE item ->> 'kind' = 'box') <> 1
     OR jsonb_array_length(p_items) <> (
       SELECT count(DISTINCT item ->> 'line_id')::integer FROM jsonb_array_elements(p_items) source(item)
     )
     OR jsonb_array_length(p_personalizations) <> (
       SELECT count(DISTINCT item ->> 'line_id')::integer FROM jsonb_array_elements(p_personalizations) source(item)
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Linhas de kit duplicadas ou embalagem inválida.';
  END IF;

  SELECT * INTO v_profile
    FROM public.profiles
   WHERE user_id = p_actor_id
     AND is_active IS TRUE
     AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O usuário não possui perfil ativo.';
  END IF;

  v_payload_hash := p_request_hash;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_actor_id::text || ':' || trim(p_idempotency_key), 0));
  SELECT * INTO v_existing
    FROM public.sicoob_kit_quote_requests
   WHERE actor_id = p_actor_id
     AND idempotency_key = trim(p_idempotency_key);
  IF FOUND THEN
    IF v_existing.payload_hash IS DISTINCT FROM v_payload_hash THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A chave de idempotência já foi usada com conteúdo diferente.';
    END IF;
    SELECT quote_number, total INTO v_quote_number, v_total
      FROM public.quotes WHERE id = v_existing.quote_id;
    RETURN jsonb_build_object('quote_id', v_existing.quote_id, 'quote_number', v_quote_number, 'total', v_total);
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    IF COALESCE(length(v_item ->> 'line_id'), 0) NOT BETWEEN 1 AND 64
       OR v_item ->> 'kind' NOT IN ('box', 'item')
       OR NULLIF(v_item ->> 'product_id', '') IS NULL
       OR NULLIF(trim(v_item ->> 'product_name'), '') IS NULL
       OR COALESCE((v_item ->> 'quantity')::integer, 0) <= 0
       OR COALESCE((v_item ->> 'unit_price')::numeric, 0) <= 0
       OR COALESCE((v_item ->> 'minimum_quantity')::integer, 1) <= 0 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Item verificado do kit inválido.';
    END IF;

    v_checked_at := NULLIF(v_item ->> 'catalog_checked_at', '')::timestamptz;
    IF v_checked_at IS NULL
       OR v_checked_at < now() - interval '5 minutes'
       OR v_checked_at > now() + interval '1 minute' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Preço e estoque precisam ser consultados novamente.';
    END IF;
    v_product_total := v_product_total
      + ((v_item ->> 'quantity')::integer * (v_item ->> 'unit_price')::numeric);
  END LOOP;

  -- MOQ é uma regra do produto, portanto duas linhas/variantes do mesmo produto
  -- devem ser avaliadas pela demanda total. Também recusamos snapshots que
  -- atribuam mínimos divergentes ao mesmo produto.
  IF EXISTS (
    SELECT 1
      FROM (
        SELECT item ->> 'product_id' AS product_id,
               sum((item ->> 'quantity')::integer) AS total_quantity,
               min(COALESCE((item ->> 'minimum_quantity')::integer, 1)) AS minimum_quantity,
               max(COALESCE((item ->> 'minimum_quantity')::integer, 1)) AS maximum_quantity
          FROM jsonb_array_elements(p_items) source(item)
         GROUP BY item ->> 'product_id'
      ) demand
     WHERE demand.minimum_quantity IS DISTINCT FROM demand.maximum_quantity
        OR demand.total_quantity < demand.minimum_quantity
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Quantidade abaixo do mínimo vigente do produto.';
  END IF;

  FOR v_personalization IN SELECT value FROM jsonb_array_elements(p_personalizations)
  LOOP
    IF NOT EXISTS (
         SELECT 1 FROM jsonb_array_elements(p_items) source(item)
          WHERE item ->> 'line_id' = v_personalization ->> 'line_id'
       )
       OR NULLIF(v_personalization ->> 'technique_id', '') IS NULL
       OR NULLIF(trim(v_personalization ->> 'technique_name'), '') IS NULL
       OR COALESCE((v_personalization ->> 'colors_count')::integer, 0) <= 0
       OR COALESCE((v_personalization ->> 'personalized_quantity')::integer, 0) <= 0
       OR COALESCE((v_personalization ->> 'unit_cost')::numeric, 0) <= 0
       OR COALESCE((v_personalization ->> 'setup_cost')::numeric, 0) < 0
       OR COALESCE((v_personalization ->> 'total_cost')::numeric, 0) <= 0 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Personalização verificada do kit inválida.';
    END IF;
    IF (v_personalization ->> 'personalized_quantity')::integer IS DISTINCT FROM (
         SELECT (item ->> 'quantity')::integer
           FROM jsonb_array_elements(p_items) source(item)
          WHERE item ->> 'line_id' = v_personalization ->> 'line_id'
       ) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A personalização não corresponde à quantidade do item.';
    END IF;

    v_checked_at := NULLIF(v_personalization ->> 'catalog_checked_at', '')::timestamptz;
    IF v_checked_at IS NULL
       OR v_checked_at < now() - interval '5 minutes'
       OR v_checked_at > now() + interval '1 minute' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'O preço da personalização precisa ser consultado novamente.';
    END IF;
    v_personalization_total := v_personalization_total + (v_personalization ->> 'total_cost')::numeric;
  END LOOP;

  v_total := round(v_product_total + v_personalization_total, 2);
  INSERT INTO public.quotes (
    client_id, client_name, seller_id, status, subtotal, total, notes,
    internal_notes, organization_id, pa_id, singular_id
  ) VALUES (
    NULL,
    'Unidade Sicoob',
    p_actor_id,
    'draft',
    v_total,
    v_total,
    format('Kit "%s" (%sx) — tipo: %s. Catálogo consultado na criação; estoque não reservado.',
      v_kit_name, v_kit_quantity, v_kit_type),
    CASE WHEN v_identity_tag IS NOT NULL THEN format('Identidade do kit: %s', v_identity_tag) ELSE NULL END,
    v_profile.organization_id,
    v_profile.pa_id,
    v_profile.cooperativa_id
  ) RETURNING id, quote_number INTO v_quote_id, v_quote_number;

  FOR v_item IN
    SELECT value
      FROM jsonb_array_elements(p_items)
     ORDER BY CASE WHEN value ->> 'kind' = 'box' THEN 0 ELSE 1 END, value ->> 'line_id'
  LOOP
    INSERT INTO public.quote_items (
      quote_id, product_id, product_name, product_sku, product_image_url,
      quantity, unit_price, color_name, color_hex, size_code, notes, sort_order,
      kit_group_id, kit_name, source_variant_id, source_variant_sku, catalog_checked_at
    ) VALUES (
      v_quote_id,
      v_item ->> 'product_id',
      v_item ->> 'product_name',
      NULLIF(v_item ->> 'product_sku', ''),
      NULLIF(v_item ->> 'product_image_url', ''),
      (v_item ->> 'quantity')::integer,
      (v_item ->> 'unit_price')::numeric,
      NULLIF(v_item ->> 'color_name', ''),
      NULLIF(v_item ->> 'color_hex', ''),
      NULLIF(v_item ->> 'size_code', ''),
      CASE WHEN v_item ->> 'kind' = 'box' THEN 'Embalagem do kit' ELSE NULL END,
      v_sort_order,
      v_group_id::text,
      v_kit_name,
      NULLIF(v_item ->> 'source_variant_id', ''),
      NULLIF(v_item ->> 'source_variant_sku', ''),
      (v_item ->> 'catalog_checked_at')::timestamptz
    ) RETURNING id INTO v_quote_item_id;

    SELECT value INTO v_personalization
      FROM jsonb_array_elements(p_personalizations)
     WHERE value ->> 'line_id' = v_item ->> 'line_id';
    IF FOUND THEN
      INSERT INTO public.quote_item_personalizations (
        quote_item_id, technique_id, technique_name, colors_count,
        width_cm, height_cm, personalized_quantity, unit_cost,
        setup_cost, total_cost, notes, catalog_checked_at
      ) VALUES (
        v_quote_item_id,
        v_personalization ->> 'technique_id',
        v_personalization ->> 'technique_name',
        (v_personalization ->> 'colors_count')::integer,
        NULLIF(v_personalization ->> 'width_cm', '')::numeric,
        NULLIF(v_personalization ->> 'height_cm', '')::numeric,
        (v_personalization ->> 'personalized_quantity')::integer,
        (v_personalization ->> 'unit_cost')::numeric,
        (v_personalization ->> 'setup_cost')::numeric,
        (v_personalization ->> 'total_cost')::numeric,
        CASE WHEN NULLIF(v_personalization ->> 'position', '') IS NOT NULL
          THEN format('Posição: %s', v_personalization ->> 'position') ELSE NULL END,
        (v_personalization ->> 'catalog_checked_at')::timestamptz
      );
    END IF;
    v_sort_order := v_sort_order + 1;
  END LOOP;

  INSERT INTO public.sicoob_kit_quote_requests (
    actor_id, idempotency_key, payload_hash, quote_id
  ) VALUES (
    p_actor_id, trim(p_idempotency_key), v_payload_hash, v_quote_id
  );

  RETURN jsonb_build_object('quote_id', v_quote_id, 'quote_number', v_quote_number, 'total', v_total);
END;
$$;

REVOKE ALL ON FUNCTION public.create_sicoob_kit_quote(jsonb, jsonb, jsonb, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_sicoob_kit_quote(jsonb, jsonb, jsonb, text, uuid, text) TO service_role;

COMMENT ON FUNCTION public.create_sicoob_kit_quote(jsonb, jsonb, jsonb, text, uuid, text) IS
  'RPC interna: persiste orçamento de kit atômico e idempotente após revalidação do catálogo pela Edge Function.';

COMMIT;

-- ============================================================
-- VERIFICACAO — rode isto depois do COMMIT acima para confirmar
-- ============================================================
select t as tabela, (to_regclass('public.'||t) is not null) as criada
from unnest(array[
  'sicoob_reorder_requests',
  'sicoob_order_invoices',
  'sicoob_order_payments',
  'sicoob_order_artwork_versions',
  'order_consolidation_orders',
  'sicoob_delivery_destinations',
  'sicoob_delivery_allocations',
  'sicoob_delivery_receipt_events',
  'sicoob_kit_quote_requests'
]) as t
order by 1;
