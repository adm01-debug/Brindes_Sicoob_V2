CREATE OR REPLACE FUNCTION public.enqueue_sicoob_approval_event(p_request_id uuid, p_event_kind text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
