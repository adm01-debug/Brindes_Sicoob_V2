-- Fila durável por solicitação/destino. Não envia mensagens nem instala cron.
CREATE TABLE public.sicoob_approval_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.sicoob_approval_requests(id) ON DELETE CASCADE,
  setting_id uuid REFERENCES public.pa_notification_settings(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('slack', 'email')),
  destination text NOT NULL,
  payload jsonb NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','sending','delivered','retry','uncertain','failed','cancelled')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  available_at timestamptz NOT NULL DEFAULT now(),
  lease_token uuid,
  lease_expires_at timestamptz,
  last_error_code text,
  provider_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  UNIQUE(request_id, channel)
);
CREATE INDEX idx_sicoob_approval_delivery_pending
  ON public.sicoob_approval_deliveries(available_at, id) WHERE state IN ('pending','retry');
CREATE INDEX idx_sicoob_approval_delivery_setting ON public.sicoob_approval_deliveries(setting_id);
ALTER TABLE public.sicoob_approval_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sicoob_approval_deliveries FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sicoob_approval_deliveries TO service_role;

CREATE FUNCTION public.enqueue_sicoob_approval_notifications(p_request_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  INSERT INTO public.sicoob_approval_deliveries(request_id, setting_id, channel, destination, payload)
  SELECT r.id, s.id, s.channel,
    CASE s.channel WHEN 'slack' THEN COALESCE(s.webhook_url, '') ELSE COALESCE(s.recipient_email, '') END,
    jsonb_build_object('requester_name', COALESCE(p.full_name, 'Solicitante'),
      'amount', r.amount_at_request, 'reason', COALESCE(r.request_reason, ''), 'order_id', r.order_id)
  FROM public.sicoob_approval_requests r
  JOIN public.sicoob_orders o ON o.id = r.order_id
  JOIN public.pa_notification_settings s ON s.pa_id = o.pa_id AND s.is_active IS TRUE
  LEFT JOIN LATERAL (
    SELECT full_name FROM public.profiles WHERE user_id = r.requester_id OR id = r.requester_id
    ORDER BY (user_id = r.requester_id) DESC NULLS LAST, id LIMIT 1
  ) p ON true
  WHERE r.id = p_request_id AND r.status = 'pending'
  ON CONFLICT(request_id, channel) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.enqueue_sicoob_approval_notifications(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_sicoob_approval_notifications(uuid) TO service_role;

CREATE FUNCTION public.queue_sicoob_approval_notifications()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.enqueue_sicoob_approval_notifications(NEW.id);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_sicoob_approval_notifications() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER tr_queue_sicoob_approval_notifications AFTER INSERT ON public.sicoob_approval_requests
FOR EACH ROW EXECUTE FUNCTION public.queue_sicoob_approval_notifications();

CREATE FUNCTION public.claim_sicoob_approval_delivery(p_request_id uuid DEFAULT NULL)
RETURNS SETOF public.sicoob_approval_deliveries LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  -- Um processo perdido pode ter entregue antes de cair. Não reenviar às cegas.
  UPDATE public.sicoob_approval_deliveries SET state='uncertain', last_error_code='lease_expired', updated_at=clock_timestamp()
  WHERE state='sending' AND lease_expires_at <= clock_timestamp()
    AND (p_request_id IS NULL OR request_id=p_request_id);
  -- Mudança de destino/desativação ou decisão da solicitação cancela o que não saiu.
  UPDATE public.sicoob_approval_deliveries d SET state='cancelled', last_error_code='source_changed', updated_at=clock_timestamp()
  WHERE d.state IN ('pending','retry') AND (p_request_id IS NULL OR d.request_id=p_request_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.pa_notification_settings s
      JOIN public.sicoob_approval_requests r ON r.id=d.request_id
      JOIN public.sicoob_orders o ON o.id=r.order_id
      WHERE s.id=d.setting_id AND s.pa_id=o.pa_id AND s.is_active IS TRUE
        AND s.channel=d.channel AND r.status='pending'
        AND d.destination=CASE s.channel WHEN 'slack' THEN COALESCE(s.webhook_url,'') ELSE COALESCE(s.recipient_email,'') END
    );
  SELECT d.id INTO v_id FROM public.sicoob_approval_deliveries d
  WHERE d.state IN ('pending','retry') AND d.available_at <= clock_timestamp() AND d.attempts < 5
    AND (p_request_id IS NULL OR d.request_id=p_request_id)
  ORDER BY d.available_at, d.id FOR UPDATE SKIP LOCKED LIMIT 1;
  IF v_id IS NULL THEN RETURN; END IF;
  RETURN QUERY UPDATE public.sicoob_approval_deliveries SET state='sending', attempts=attempts+1,
    lease_token=gen_random_uuid(), lease_expires_at=clock_timestamp()+interval '60 seconds', updated_at=clock_timestamp()
    WHERE id=v_id RETURNING *;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_sicoob_approval_delivery(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_sicoob_approval_delivery(uuid) TO service_role;

CREATE FUNCTION public.finish_sicoob_approval_delivery(p_id uuid, p_lease_token uuid, p_outcome text,
  p_error_code text DEFAULT NULL, p_provider_id text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_outcome IS NULL OR p_outcome NOT IN ('delivered','retry','uncertain','failed')
    OR (p_error_code IS NOT NULL AND p_error_code !~ '^[a-z0-9_]{1,80}$')
    OR length(p_provider_id)>200 THEN
    RAISE EXCEPTION 'Resultado de entrega inválido.' USING ERRCODE='22023';
  END IF;
  UPDATE public.sicoob_approval_deliveries SET
    state=CASE WHEN p_outcome='retry' AND attempts>=5 THEN 'failed' ELSE p_outcome END,
    available_at=clock_timestamp()+make_interval(secs => LEAST(900,30*power(2,attempts-1))::integer),
    last_error_code=p_error_code, provider_id=p_provider_id, updated_at=clock_timestamp(),
    delivered_at=CASE WHEN p_outcome='delivered' THEN clock_timestamp() END,
    lease_expires_at=NULL, lease_token=NULL
  WHERE id=p_id AND state='sending' AND lease_token=p_lease_token AND lease_expires_at>clock_timestamp();
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.finish_sicoob_approval_delivery(uuid,uuid,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_sicoob_approval_delivery(uuid,uuid,text,text,text) TO service_role;

CREATE FUNCTION public.get_sicoob_approval_delivery_summary(p_request_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT jsonb_build_object('delivered',count(*) FILTER (WHERE state='delivered'),
    'pending',count(*) FILTER (WHERE state IN ('pending','sending','retry')),
    'uncertain',count(*) FILTER (WHERE state='uncertain'),
    'failed',count(*) FILTER (WHERE state='failed'), 'cancelled',count(*) FILTER (WHERE state='cancelled'))
  FROM public.sicoob_approval_deliveries WHERE p_request_id IS NULL OR request_id=p_request_id;
$$;
REVOKE ALL ON FUNCTION public.get_sicoob_approval_delivery_summary(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_sicoob_approval_delivery_summary(uuid) TO service_role;
