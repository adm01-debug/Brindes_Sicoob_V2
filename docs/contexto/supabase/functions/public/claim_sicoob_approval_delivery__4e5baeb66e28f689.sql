CREATE OR REPLACE FUNCTION public.claim_sicoob_approval_delivery(p_request_id uuid DEFAULT NULL::uuid)
 RETURNS SETOF sicoob_approval_deliveries
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
