-- Evolução da outbox: eventos versionados, correção de destino e recibos fortes.
ALTER TABLE public.sicoob_approval_deliveries
  ADD COLUMN event_kind text NOT NULL DEFAULT 'request_created'
    CHECK (event_kind IN ('request_created', 'escalated_to_board')),
  ADD COLUMN generation integer NOT NULL DEFAULT 1 CHECK (generation > 0),
  ADD COLUMN supersedes_delivery_id uuid REFERENCES public.sicoob_approval_deliveries(id) ON DELETE SET NULL;

ALTER TABLE public.sicoob_approval_deliveries
  DROP CONSTRAINT sicoob_approval_deliveries_request_id_channel_key;
ALTER TABLE public.sicoob_approval_deliveries
  ADD CONSTRAINT sicoob_approval_deliveries_event_generation_key
  UNIQUE(request_id, event_kind, channel, generation);

-- A versão anterior não exigia recibo do provedor nem código para falhas. Um
-- registro legado sem essas evidências não pode continuar afirmando entrega.
-- Preserve-o como resultado incerto para reconciliação humana, sem inventar
-- um identificador de provedor que nunca existiu.
UPDATE public.sicoob_approval_deliveries
SET state = 'uncertain',
    last_error_code = 'legacy_missing_provider_receipt',
    delivered_at = NULL,
    updated_at = clock_timestamp()
WHERE state = 'delivered'
  AND NULLIF(btrim(provider_id), '') IS NULL;

UPDATE public.sicoob_approval_deliveries
SET last_error_code = 'legacy_unclassified_delivery',
    updated_at = clock_timestamp()
WHERE state IN ('retry', 'uncertain', 'failed')
  AND NULLIF(btrim(last_error_code), '') IS NULL;

ALTER TABLE public.sicoob_approval_deliveries
  ADD CONSTRAINT sicoob_approval_deliveries_result_receipt_check CHECK (
    (state <> 'delivered' OR (provider_id IS NOT NULL AND btrim(provider_id) <> ''))
    AND (state NOT IN ('retry','uncertain','failed') OR (last_error_code IS NOT NULL AND btrim(last_error_code) <> ''))
  );

CREATE INDEX idx_sicoob_approval_delivery_expired_lease
  ON public.sicoob_approval_deliveries(lease_expires_at)
  WHERE state = 'sending';
CREATE INDEX idx_sicoob_approval_delivery_request_event
  ON public.sicoob_approval_deliveries(request_id, event_kind, channel, generation DESC);

CREATE FUNCTION public.enqueue_sicoob_approval_event(p_request_id uuid, p_event_kind text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  IF p_event_kind IS NULL OR p_event_kind NOT IN ('request_created', 'escalated_to_board') THEN
    RAISE EXCEPTION 'Evento de aprovação inválido.' USING ERRCODE='22023';
  END IF;

  INSERT INTO public.sicoob_approval_deliveries(
    request_id, setting_id, channel, destination, payload,
    event_kind, generation, supersedes_delivery_id
  )
  SELECT r.id, s.id, s.channel,
    CASE s.channel WHEN 'slack' THEN COALESCE(s.webhook_url, '') ELSE COALESCE(s.recipient_email, '') END,
    jsonb_build_object(
      'requester_name', COALESCE(p.full_name, 'Solicitante'),
      'amount', r.amount_at_request,
      'reason', COALESCE(r.request_reason, ''),
      'order_id', r.order_id,
      'event_kind', p_event_kind
    ),
    p_event_kind,
    COALESCE(previous.generation, 0) + 1,
    previous.id
  FROM public.sicoob_approval_requests r
  JOIN public.sicoob_orders o ON o.id = r.order_id
  JOIN public.pa_notification_settings s ON s.pa_id = o.pa_id AND s.is_active IS TRUE
  LEFT JOIN LATERAL (
    SELECT full_name FROM public.profiles WHERE user_id = r.requester_id OR id = r.requester_id
    ORDER BY (user_id = r.requester_id) DESC NULLS LAST, id LIMIT 1
  ) p ON true
  LEFT JOIN LATERAL (
    SELECT d.id, d.generation
    FROM public.sicoob_approval_deliveries d
    WHERE d.request_id = r.id AND d.event_kind = p_event_kind AND d.channel = s.channel
    ORDER BY d.generation DESC LIMIT 1
  ) previous ON true
  WHERE r.id = p_request_id AND r.status = 'pending'
    AND NOT EXISTS (
      SELECT 1 FROM public.sicoob_approval_deliveries d
      WHERE d.request_id = r.id AND d.event_kind = p_event_kind AND d.channel = s.channel
        AND d.destination = CASE s.channel WHEN 'slack' THEN COALESCE(s.webhook_url, '') ELSE COALESCE(s.recipient_email, '') END
        AND d.state <> 'cancelled'
    )
  ON CONFLICT(request_id, event_kind, channel, generation) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.enqueue_sicoob_approval_event(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_sicoob_approval_event(uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.enqueue_sicoob_approval_notifications(p_request_id uuid)
RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public.enqueue_sicoob_approval_event(p_request_id, 'request_created');
$$;
REVOKE ALL ON FUNCTION public.enqueue_sicoob_approval_notifications(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_sicoob_approval_notifications(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.queue_sicoob_approval_notifications()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.enqueue_sicoob_approval_event(NEW.id, 'request_created');
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_sicoob_approval_notifications() FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.queue_sicoob_approval_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE((OLD.metadata->>'escalated')::boolean, false) IS FALSE
     AND COALESCE((NEW.metadata->>'escalated')::boolean, false) IS TRUE THEN
    PERFORM public.enqueue_sicoob_approval_event(NEW.id, 'escalated_to_board');
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_sicoob_approval_escalation() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER tr_queue_sicoob_approval_escalation
AFTER UPDATE OF metadata ON public.sicoob_approval_requests
FOR EACH ROW EXECUTE FUNCTION public.queue_sicoob_approval_escalation();

CREATE OR REPLACE FUNCTION public.finish_sicoob_approval_delivery(
  p_id uuid, p_lease_token uuid, p_outcome text,
  p_error_code text DEFAULT NULL, p_provider_id text DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_outcome IS NULL OR p_outcome NOT IN ('delivered','retry','uncertain','failed')
    OR (p_error_code IS NOT NULL AND p_error_code !~ '^[a-z0-9_]{1,80}$')
    OR length(p_provider_id)>200
    OR (p_outcome='delivered' AND (p_provider_id IS NULL OR btrim(p_provider_id)=''))
    OR (p_outcome IN ('retry','uncertain','failed') AND (p_error_code IS NULL OR btrim(p_error_code)='')) THEN
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
