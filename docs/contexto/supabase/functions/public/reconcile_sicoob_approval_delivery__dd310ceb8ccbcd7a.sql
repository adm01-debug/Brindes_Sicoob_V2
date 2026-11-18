CREATE OR REPLACE FUNCTION public.reconcile_sicoob_approval_delivery(p_delivery_id uuid, p_resolution text, p_provider_id text DEFAULT NULL::text, p_reason text DEFAULT NULL::text, p_operator text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_delivery public.sicoob_approval_deliveries%ROWTYPE;
  v_new_id uuid;
  v_setting public.pa_notification_settings%ROWTYPE;
  v_expected_destination text;
BEGIN
  IF p_resolution NOT IN ('delivered','requeue')
     OR length(btrim(COALESCE(p_reason,''))) NOT BETWEEN 10 AND 500
     OR length(btrim(COALESCE(p_operator,''))) NOT BETWEEN 3 AND 200
     OR length(p_provider_id) > 200
     OR (p_resolution='delivered' AND NULLIF(btrim(p_provider_id),'') IS NULL) THEN
    RAISE EXCEPTION 'Reconciliação inválida.' USING ERRCODE='22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_delivery_id::text || ':reconcile',0));
  SELECT * INTO v_delivery FROM public.sicoob_approval_deliveries
   WHERE id=p_delivery_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Entrega não encontrada.' USING ERRCODE='P0002'; END IF;
  IF v_delivery.state NOT IN ('uncertain','failed') OR v_delivery.reconciliation IS NOT NULL THEN
    RAISE EXCEPTION 'A entrega não está disponível para reconciliação.' USING ERRCODE='23514';
  END IF;

  IF p_resolution='delivered' THEN
    UPDATE public.sicoob_approval_deliveries SET
      state='delivered', provider_id=btrim(p_provider_id), delivered_at=clock_timestamp(),
      last_error_code=NULL, updated_at=clock_timestamp(),
      reconciliation=jsonb_build_object(
        'resolution','delivered','reason',btrim(p_reason),'operator',btrim(p_operator),
        'provider_id',btrim(p_provider_id),'reconciled_at',clock_timestamp()
      )
    WHERE id=p_delivery_id;
    RETURN p_delivery_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.sicoob_approval_deliveries newer
    WHERE newer.request_id=v_delivery.request_id AND newer.event_kind=v_delivery.event_kind
      AND newer.channel=v_delivery.channel AND newer.generation>v_delivery.generation
      AND newer.state<>'cancelled'
  ) THEN
    RAISE EXCEPTION 'Já existe geração posterior para esta entrega.' USING ERRCODE='23514';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.sicoob_approval_requests r
    WHERE r.id=v_delivery.request_id AND r.status='pending'
  ) THEN
    RAISE EXCEPTION 'A solicitação não está mais pendente.' USING ERRCODE='23514';
  END IF;
  SELECT * INTO v_setting FROM public.pa_notification_settings s
   WHERE s.id=v_delivery.setting_id AND s.is_active IS TRUE AND s.channel=v_delivery.channel;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'A configuração do destino não está ativa.' USING ERRCODE='23514';
  END IF;
  v_expected_destination := CASE v_setting.channel
    WHEN 'slack' THEN COALESCE(v_setting.webhook_url,'')
    ELSE COALESCE(v_setting.recipient_email,'') END;
  UPDATE public.sicoob_approval_deliveries SET
    reconciliation=jsonb_build_object(
      'resolution','requeue','reason',btrim(p_reason),'operator',btrim(p_operator),
      'reconciled_at',clock_timestamp()
    ), updated_at=clock_timestamp()
  WHERE id=p_delivery_id;

  INSERT INTO public.sicoob_approval_deliveries(
    request_id,setting_id,channel,destination,payload,event_kind,generation,supersedes_delivery_id
  ) VALUES (
    v_delivery.request_id,v_setting.id,v_delivery.channel,v_expected_destination,
    v_delivery.payload || jsonb_build_object(
      'reconciliation_reason',btrim(p_reason),'reconciliation_operator',btrim(p_operator)
    ),
    v_delivery.event_kind,v_delivery.generation+1,v_delivery.id
  ) RETURNING id INTO v_new_id;
  RETURN v_new_id;
END;
$function$
