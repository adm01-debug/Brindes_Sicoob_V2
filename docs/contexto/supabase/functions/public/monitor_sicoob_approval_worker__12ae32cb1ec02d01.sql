CREATE OR REPLACE FUNCTION public.monitor_sicoob_approval_worker()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'net'
AS $function$
DECLARE v_failed bigint; v_queued bigint; v_oldest_seconds integer; v_pending_old bigint; v_unresolved bigint;
BEGIN
  WITH response_matches AS (
    SELECT DISTINCT ON (r.id)
      d.id AS dispatch_id, r.status_code, r.error_msg, r.content, r.timed_out, r.created
    FROM net._http_response r
    JOIN public.sicoob_approval_worker_dispatches d
      ON d.request_id=r.id AND d.state='queued'
        AND r.created >= d.requested_at - interval '5 seconds'
    ORDER BY r.id, d.requested_at DESC, r.created ASC, d.id DESC,
      r.status_code NULLS FIRST, r.error_msg NULLS FIRST, r.content NULLS FIRST
  )
  UPDATE public.sicoob_approval_worker_dispatches d SET
    state=CASE WHEN r.timed_out IS TRUE THEN 'timed_out'
      WHEN r.error_msg IS NOT NULL OR r.status_code NOT BETWEEN 200 AND 299 THEN 'failed'
      ELSE 'succeeded' END,
    status_code=r.status_code,
    error_message=left(COALESCE(r.error_msg,r.content),1000),
    completed_at=COALESCE(r.created,clock_timestamp())
  FROM response_matches r
  WHERE d.id=r.dispatch_id;

  WITH pending_status AS (
    SELECT older.id,
      older.requested_at < clock_timestamp() - interval '2 minutes' AS expired,
      EXISTS (
        SELECT 1 FROM public.sicoob_approval_worker_dispatches newer
        WHERE newer.request_id=older.request_id
          AND newer.requested_at>older.requested_at
          AND newer.state<>'queued' AND newer.completed_at IS NOT NULL
      ) AS has_newer_result
    FROM public.sicoob_approval_worker_dispatches older
    WHERE older.state='queued'
  )
  UPDATE public.sicoob_approval_worker_dispatches older SET
    state='timed_out',
    error_message=CASE WHEN pending_status.has_newer_result
      THEN 'ID reciclado; resposta correlacionada ao disparo mais recente'
      ELSE 'Resposta do pg_net não observada em dois minutos' END,
    completed_at=clock_timestamp()
  FROM pending_status
  WHERE older.id=pending_status.id
    AND (pending_status.has_newer_result OR pending_status.expired);

  DELETE FROM public.sicoob_approval_worker_dispatches
  WHERE requested_at<clock_timestamp()-interval '30 days';

  SELECT count(*) FILTER (WHERE state IN ('failed','timed_out')),
         count(*) FILTER (WHERE state='queued'),
         COALESCE(extract(epoch FROM clock_timestamp()-(min(requested_at) FILTER (WHERE state='queued'))),0)::integer
  INTO v_failed,v_queued,v_oldest_seconds
  FROM public.sicoob_approval_worker_dispatches
  WHERE requested_at>=clock_timestamp()-interval '24 hours';

  SELECT count(*) INTO v_pending_old FROM public.sicoob_approval_deliveries
  WHERE state IN ('pending','retry') AND available_at<clock_timestamp()-interval '5 minutes';
  SELECT count(*) INTO v_unresolved FROM public.sicoob_approval_deliveries
  WHERE state IN ('failed','uncertain') AND reconciliation IS NULL;
  RETURN jsonb_build_object(
    'failed_24h',v_failed,'queued',v_queued,'oldest_queued_seconds',v_oldest_seconds,
    'deliveries_delayed',v_pending_old,'unresolved_deliveries',v_unresolved,
    'healthy',v_failed=0 AND v_pending_old=0 AND v_unresolved=0
  );
END;
$function$
