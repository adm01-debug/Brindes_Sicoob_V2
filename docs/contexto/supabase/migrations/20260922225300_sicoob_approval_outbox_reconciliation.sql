-- Reconciliação manual auditável e retenção da outbox. Entregas incertas nunca
-- são reenviadas automaticamente: o operador confirma o recibo ou cria uma
-- geração sucessora explícita.
ALTER TABLE public.sicoob_approval_deliveries
  ADD COLUMN reconciliation jsonb;

CREATE TABLE public.sicoob_approval_delivery_archive (
  archive_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL UNIQUE,
  delivery_record jsonb NOT NULL,
  retention_reason text NOT NULL CHECK (retention_reason IN ('delivered_or_cancelled_180d','failed_or_uncertain_365d')),
  archived_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.sicoob_approval_delivery_archive ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sicoob_approval_delivery_archive FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.sicoob_approval_delivery_archive TO service_role;

-- O enqueue automático só substitui uma entrega cancelada antes da primeira
-- tentativa. Depois de qualquer tentativa, uma nova geração exige reconciliação.
CREATE OR REPLACE FUNCTION public.enqueue_sicoob_approval_event(p_request_id uuid, p_event_kind text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  IF p_event_kind IS NULL OR p_event_kind NOT IN ('request_created','escalated_to_board') THEN
    RAISE EXCEPTION 'Evento de aprovação inválido.' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.sicoob_approval_deliveries(
    request_id,setting_id,channel,destination,payload,event_kind,generation,supersedes_delivery_id
  )
  SELECT r.id,s.id,s.channel,
    CASE s.channel WHEN 'slack' THEN COALESCE(s.webhook_url,'') ELSE COALESCE(s.recipient_email,'') END,
    jsonb_build_object(
      'requester_name',COALESCE(p.full_name,'Solicitante'),'amount',r.amount_at_request,
      'reason',COALESCE(r.request_reason,''),'order_id',r.order_id,'event_kind',p_event_kind
    ),p_event_kind,COALESCE(previous.generation,0)+1,previous.id
  FROM public.sicoob_approval_requests r
  JOIN public.sicoob_orders o ON o.id=r.order_id
  JOIN public.pa_notification_settings s ON s.pa_id=o.pa_id AND s.is_active IS TRUE
  LEFT JOIN LATERAL (
    SELECT full_name FROM public.profiles WHERE user_id=r.requester_id OR id=r.requester_id
    ORDER BY (user_id=r.requester_id) DESC NULLS LAST,id LIMIT 1
  ) p ON true
  LEFT JOIN LATERAL (
    SELECT d.id,d.generation,d.state,d.attempts,d.last_error_code
    FROM public.sicoob_approval_deliveries d
    WHERE d.request_id=r.id AND d.event_kind=p_event_kind AND d.channel=s.channel
    ORDER BY d.generation DESC LIMIT 1
  ) previous ON true
  WHERE r.id=p_request_id AND r.status='pending'
    AND (previous.id IS NULL OR (
      previous.state='cancelled' AND previous.attempts=0 AND previous.last_error_code='source_changed'
    ))
    AND NOT EXISTS (
      SELECT 1 FROM public.sicoob_approval_deliveries d
      WHERE d.request_id=r.id AND d.event_kind=p_event_kind AND d.channel=s.channel
        AND d.destination=CASE s.channel WHEN 'slack' THEN COALESCE(s.webhook_url,'') ELSE COALESCE(s.recipient_email,'') END
        AND d.state<>'cancelled'
    )
  ON CONFLICT(request_id,event_kind,channel,generation) DO NOTHING;
  GET DIAGNOSTICS v_count=ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.enqueue_sicoob_approval_event(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_sicoob_approval_event(uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_sicoob_approval_delivery(p_request_id uuid DEFAULT NULL)
RETURNS SETOF public.sicoob_approval_deliveries LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid; v_changed record;
BEGIN
  UPDATE public.sicoob_approval_deliveries SET state='uncertain',last_error_code='lease_expired',updated_at=clock_timestamp()
  WHERE state='sending' AND lease_expires_at<=clock_timestamp()
    AND (p_request_id IS NULL OR request_id=p_request_id);

  UPDATE public.sicoob_approval_deliveries d SET
    state=CASE WHEN d.attempts=0 THEN 'cancelled' ELSE 'uncertain' END,
    last_error_code=CASE WHEN d.attempts=0 THEN 'source_changed' ELSE 'destination_changed_after_attempt' END,
    updated_at=clock_timestamp()
  WHERE d.state IN ('pending','retry') AND (p_request_id IS NULL OR d.request_id=p_request_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.pa_notification_settings s
      JOIN public.sicoob_approval_requests r ON r.id=d.request_id
      JOIN public.sicoob_orders o ON o.id=r.order_id
      WHERE s.id=d.setting_id AND s.pa_id=o.pa_id AND s.is_active IS TRUE
        AND s.channel=d.channel AND r.status='pending'
        AND d.destination=CASE s.channel WHEN 'slack' THEN COALESCE(s.webhook_url,'') ELSE COALESCE(s.recipient_email,'') END
    );

  FOR v_changed IN
    SELECT DISTINCT d.request_id,d.event_kind
    FROM public.sicoob_approval_deliveries d
    JOIN public.sicoob_approval_requests r ON r.id=d.request_id AND r.status='pending'
    WHERE d.state='cancelled' AND d.attempts=0 AND d.last_error_code='source_changed'
      AND (p_request_id IS NULL OR d.request_id=p_request_id)
  LOOP
    PERFORM public.enqueue_sicoob_approval_event(v_changed.request_id,v_changed.event_kind);
  END LOOP;

  SELECT d.id INTO v_id FROM public.sicoob_approval_deliveries d
  WHERE d.state IN ('pending','retry') AND d.available_at<=clock_timestamp() AND d.attempts<5
    AND (p_request_id IS NULL OR d.request_id=p_request_id)
  ORDER BY d.available_at,d.id FOR UPDATE SKIP LOCKED LIMIT 1;
  IF v_id IS NULL THEN RETURN; END IF;
  RETURN QUERY UPDATE public.sicoob_approval_deliveries SET state='sending',attempts=attempts+1,
    lease_token=gen_random_uuid(),lease_expires_at=clock_timestamp()+interval '60 seconds',updated_at=clock_timestamp()
  WHERE id=v_id RETURNING *;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_sicoob_approval_delivery(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_sicoob_approval_delivery(uuid) TO service_role;

CREATE FUNCTION public.reconcile_sicoob_approval_delivery(
  p_delivery_id uuid,
  p_resolution text,
  p_provider_id text DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_operator text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;
REVOKE ALL ON FUNCTION public.reconcile_sicoob_approval_delivery(uuid,text,text,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_sicoob_approval_delivery(uuid,text,text,text,text)
  TO service_role;

CREATE FUNCTION public.archive_sicoob_approval_deliveries(p_batch_size integer DEFAULT 1000)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  IF p_batch_size NOT BETWEEN 1 AND 5000 THEN
    RAISE EXCEPTION 'Tamanho de lote inválido.' USING ERRCODE='22023';
  END IF;
  WITH candidates AS (
    SELECT d.id,
      CASE WHEN d.state IN ('delivered','cancelled') THEN 'delivered_or_cancelled_180d'
           ELSE 'failed_or_uncertain_365d' END AS reason
    FROM public.sicoob_approval_deliveries d
    WHERE ((d.state IN ('delivered','cancelled') AND d.updated_at < clock_timestamp()-interval '180 days')
       OR (d.state IN ('failed','uncertain') AND d.updated_at < clock_timestamp()-interval '365 days'))
      AND NOT EXISTS (SELECT 1 FROM public.sicoob_approval_deliveries child WHERE child.supersedes_delivery_id=d.id)
    ORDER BY d.updated_at,d.id FOR UPDATE SKIP LOCKED LIMIT p_batch_size
  ), archived AS (
    INSERT INTO public.sicoob_approval_delivery_archive(delivery_id,delivery_record,retention_reason)
    SELECT d.id,to_jsonb(d),c.reason FROM candidates c
    JOIN public.sicoob_approval_deliveries d ON d.id=c.id
    ON CONFLICT(delivery_id) DO NOTHING RETURNING delivery_id
  )
  DELETE FROM public.sicoob_approval_deliveries d USING archived a WHERE d.id=a.delivery_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.archive_sicoob_approval_deliveries(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_sicoob_approval_deliveries(integer) TO service_role;

DO $block$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job
  WHERE jobname='sicoob-approval-outbox-retention';
END;
$block$;
SELECT cron.schedule(
  'sicoob-approval-outbox-retention','23 3 * * *',
  $cron$SELECT public.archive_sicoob_approval_deliveries();$cron$
);
