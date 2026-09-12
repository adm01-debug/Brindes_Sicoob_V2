-- Logística canônica dos pedidos Sicoob.
-- As tabelas order_logistics e order_invoices legadas referenciam public.orders;
-- não devem receber dados de public.sicoob_orders.

CREATE TABLE IF NOT EXISTS public.sicoob_order_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.sicoob_orders(id) ON DELETE CASCADE,
  carrier_name text,
  tracking_code text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'delivered')),
  estimated_delivery date,
  actual_delivery_at timestamptz,
  delivery_photo_path text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sicoob_shipment_delivery_proof_path CHECK (
    delivery_photo_path IS NULL OR delivery_photo_path LIKE order_id::text || '/delivery/%'
  )
);

CREATE INDEX IF NOT EXISTS idx_sicoob_order_shipments_order_id
  ON public.sicoob_order_shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_sicoob_order_shipments_tracking_code
  ON public.sicoob_order_shipments(tracking_code) WHERE tracking_code IS NOT NULL;

ALTER TABLE public.sicoob_order_shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sicoob_shipment_read_in_order_scope"
  ON public.sicoob_order_shipments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sicoob_orders o WHERE o.id = order_id
  ));

-- O bucket é privado: a interface usa URL assinada curta, nunca URL pública.
INSERT INTO storage.buckets (id, name, public)
VALUES ('sicoob-order-documents', 'sicoob-order-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

CREATE POLICY "sicoob_order_documents_read_in_order_scope"
  ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'sicoob-order-documents'
    AND EXISTS (
      SELECT 1 FROM public.sicoob_orders o
      WHERE o.id::text = split_part(name, '/', 1)
    )
  );

CREATE POLICY "sicoob_order_documents_upload_by_authorized_actor"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'sicoob-order-documents'
    AND name ~ '^[0-9a-fA-F-]+/delivery/.+$'
    AND EXISTS (
      SELECT 1
      FROM public.sicoob_orders o
      LEFT JOIN public.profiles p ON p.user_id = auth.uid() OR p.id = auth.uid()
      WHERE o.id::text = split_part(name, '/', 1)
        AND (
          o.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role::text IN ('dev', 'supervisor')
          )
          OR (
            EXISTS (
              SELECT 1 FROM public.user_roles ur
              WHERE ur.user_id = auth.uid()
                AND ur.role::text IN ('gestor_compras', 'comprador_singular')
            )
            AND p.cooperativa_id = o.cooperative_id
          )
          OR (
            EXISTS (
              SELECT 1 FROM public.user_roles ur
              WHERE ur.user_id = auth.uid() AND ur.role::text = 'gerente_pa'
            )
            AND p.pa_id = o.pa_id
          )
        )
    )
  );

CREATE OR REPLACE FUNCTION public.sicoob_actor_can_manage_fulfillment(
  p_actor_id uuid,
  p_order_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sicoob_orders o
    LEFT JOIN public.profiles p ON p.user_id = p_actor_id OR p.id = p_actor_id
    WHERE o.id = p_order_id
      AND (
        o.created_by = p_actor_id
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = p_actor_id
            AND ur.role::text IN ('dev', 'supervisor')
        )
        OR (
          EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = p_actor_id
              AND ur.role::text IN ('gestor_compras', 'comprador_singular')
          )
          AND p.cooperativa_id = o.cooperative_id
        )
        OR (
          EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = p_actor_id AND ur.role::text = 'gerente_pa'
          )
          AND p.pa_id = o.pa_id
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.sicoob_actor_can_manage_fulfillment(uuid, uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.get_sicoob_order_shipment(p_order_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT to_jsonb(s)
  FROM public.sicoob_order_shipments s
  WHERE s.order_id = p_order_id;
$$;

CREATE OR REPLACE FUNCTION public.upsert_sicoob_order_shipment(
  p_order_id uuid,
  p_expected_order_status text,
  p_carrier_name text DEFAULT NULL,
  p_tracking_code text DEFAULT NULL,
  p_estimated_delivery date DEFAULT NULL,
  p_delivery_photo_path text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_order public.sicoob_orders%ROWTYPE;
  v_shipment public.sicoob_order_shipments%ROWTYPE;
  v_target_order_status text;
  v_shipment_status text;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Autenticação necessária.';
  END IF;

  SELECT * INTO v_order
  FROM public.sicoob_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Pedido não encontrado.';
  END IF;
  IF v_order.status IS DISTINCT FROM p_expected_order_status THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'O pedido mudou; atualize a página antes de salvar a logística.';
  END IF;
  IF NOT public.sicoob_actor_can_manage_fulfillment(v_actor_id, p_order_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Você não possui permissão para alterar a logística deste pedido.';
  END IF;

  IF p_delivery_photo_path IS NOT NULL THEN
    IF p_delivery_photo_path NOT LIKE p_order_id::text || '/delivery/%' THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O comprovante deve pertencer ao pedido informado.';
    END IF;
    IF v_order.status <> 'logistic' THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O comprovante só pode concluir um pedido em logística.';
    END IF;
    v_target_order_status := 'completed';
    v_shipment_status := 'delivered';
  ELSE
    IF v_order.status NOT IN ('confirmed', 'logistic') THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O rastreio só pode ser registrado para um pedido confirmado ou em logística.';
    END IF;
    IF coalesce(btrim(p_carrier_name), '') = '' OR coalesce(btrim(p_tracking_code), '') = '' THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Transportadora e código de rastreio são obrigatórios.';
    END IF;
    v_target_order_status := 'logistic';
    v_shipment_status := 'in_transit';
  END IF;

  INSERT INTO public.sicoob_order_shipments (
    order_id, carrier_name, tracking_code, status, estimated_delivery,
    actual_delivery_at, delivery_photo_path, created_by
  ) VALUES (
    p_order_id, nullif(btrim(p_carrier_name), ''), nullif(btrim(p_tracking_code), ''),
    v_shipment_status, p_estimated_delivery,
    CASE WHEN p_delivery_photo_path IS NOT NULL THEN now() ELSE NULL END,
    p_delivery_photo_path, v_actor_id
  )
  ON CONFLICT (order_id) DO UPDATE SET
    carrier_name = coalesce(EXCLUDED.carrier_name, public.sicoob_order_shipments.carrier_name),
    tracking_code = coalesce(EXCLUDED.tracking_code, public.sicoob_order_shipments.tracking_code),
    status = EXCLUDED.status,
    estimated_delivery = coalesce(EXCLUDED.estimated_delivery, public.sicoob_order_shipments.estimated_delivery),
    actual_delivery_at = coalesce(EXCLUDED.actual_delivery_at, public.sicoob_order_shipments.actual_delivery_at),
    delivery_photo_path = coalesce(EXCLUDED.delivery_photo_path, public.sicoob_order_shipments.delivery_photo_path),
    updated_at = now()
  RETURNING * INTO v_shipment;

  IF v_order.status IS DISTINCT FROM v_target_order_status THEN
    UPDATE public.sicoob_orders
    SET status = v_target_order_status, updated_at = now()
    WHERE id = p_order_id;
  END IF;

  RETURN to_jsonb(v_shipment);
END;
$$;

REVOKE ALL ON FUNCTION public.get_sicoob_order_shipment(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_sicoob_order_shipment(uuid, text, text, text, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sicoob_order_shipment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_sicoob_order_shipment(uuid, text, text, text, date, text) TO authenticated;
