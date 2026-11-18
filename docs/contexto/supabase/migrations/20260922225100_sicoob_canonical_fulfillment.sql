-- Alinha a logística transacional com os estados canônicos do pedido. O estado
-- `logistic` permanece somente como caminho de compatibilidade para pedidos antigos.
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

  SELECT * INTO v_order FROM public.sicoob_orders WHERE id = p_order_id FOR UPDATE;
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
    IF length(p_delivery_photo_path) > 300
       OR p_delivery_photo_path NOT LIKE p_order_id::text || '/delivery/%'
       OR substring(p_delivery_photo_path FROM length(p_order_id::text || '/delivery/') + 1)
            !~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,239}$'
       OR position('..' IN p_delivery_photo_path) > 0 THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O comprovante deve pertencer ao pedido informado.';
    END IF;
    IF v_order.status NOT IN ('in_transit', 'logistic') THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O comprovante só pode confirmar um pedido em trânsito.';
    END IF;
    v_target_order_status := CASE WHEN v_order.status = 'logistic' THEN 'completed' ELSE 'delivered' END;
    v_shipment_status := 'delivered';
  ELSE
    IF v_order.status NOT IN ('in_separation', 'in_transit', 'logistic') THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O rastreio só pode ser registrado durante a separação ou o trânsito.';
    END IF;
    IF coalesce(btrim(p_carrier_name), '') = '' OR coalesce(btrim(p_tracking_code), '') = '' THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Transportadora e código de rastreio são obrigatórios.';
    END IF;
    IF length(p_carrier_name) > 200 OR length(p_tracking_code) > 200 THEN
      RAISE EXCEPTION USING ERRCODE = '22001', MESSAGE = 'Transportadora ou código de rastreio excede o limite.';
    END IF;
    v_target_order_status := CASE WHEN v_order.status = 'in_separation' THEN 'in_transit' ELSE v_order.status END;
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
    UPDATE public.sicoob_orders SET status = v_target_order_status, updated_at = now()
    WHERE id = p_order_id;
  END IF;
  RETURN to_jsonb(v_shipment);
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_sicoob_order_shipment(uuid,text,text,text,date,text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_sicoob_order_shipment(uuid,text,text,text,date,text)
  TO authenticated;
