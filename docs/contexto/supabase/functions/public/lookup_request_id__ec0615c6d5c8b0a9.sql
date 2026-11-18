CREATE OR REPLACE FUNCTION public.lookup_request_id(_request_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_webhook_events jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'dev'::app_role)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF _request_id IS NULL OR length(_request_id) < 8 OR length(_request_id) > 128 THEN
    RAISE EXCEPTION 'invalid_request_id' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.occurred_at), '[]'::jsonb)
  INTO v_webhook_events
  FROM (
    SELECT
      occurred_at,
      source,
      direction,
      event_type,
      endpoint,
      http_status,
      duration_ms,
      attempt,
      success,
      error_class,
      error_message,
      payload_bytes
    FROM public.webhook_delivery_metrics
    WHERE request_id = _request_id
    ORDER BY occurred_at ASC
    LIMIT 200
  ) r;

  RETURN jsonb_build_object(
    'request_id', _request_id,
    'webhook_events', v_webhook_events,
    'event_count', jsonb_array_length(v_webhook_events)
  );
END;
$function$
