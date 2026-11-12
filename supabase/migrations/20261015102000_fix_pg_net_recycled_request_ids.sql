-- O pg_net pode reciclar IDs depois de remover respostas antigas. Preserve a
-- função de monitoramento existente e altere somente seus dois blocos de
-- correlação/timeout para evitar divergência de lógica e cópia integral.
ALTER TABLE public.sicoob_approval_worker_dispatches
  DROP CONSTRAINT IF EXISTS sicoob_approval_worker_dispatches_request_id_key;

CREATE INDEX IF NOT EXISTS idx_sicoob_approval_worker_queued_request
  ON public.sicoob_approval_worker_dispatches(request_id, requested_at DESC)
  WHERE state = 'queued';

DO $patch$
DECLARE
  v_definition text;
  v_old_response text := $old_response$
  UPDATE public.sicoob_approval_worker_dispatches d SET
    state=CASE WHEN r.timed_out IS TRUE THEN 'timed_out'
      WHEN r.error_msg IS NOT NULL OR r.status_code NOT BETWEEN 200 AND 299 THEN 'failed'
      ELSE 'succeeded' END,
    status_code=r.status_code,
    error_message=left(COALESCE(r.error_msg,r.content),1000),
    completed_at=COALESCE(r.created,clock_timestamp())
  FROM net._http_response r
  WHERE d.request_id=r.id AND d.state='queued';
$old_response$;
  v_new_response text := $new_response$
  WITH response_matches AS (
    SELECT DISTINCT ON (r.id)
      d.id AS dispatch_id, r.status_code, r.error_msg, r.content, r.timed_out, r.created
    FROM net._http_response r
    JOIN public.sicoob_approval_worker_dispatches d
      ON d.request_id=r.id AND d.state='queued' AND r.created>=d.requested_at
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
$new_response$;
  v_old_timeout text := $old_timeout$
  UPDATE public.sicoob_approval_worker_dispatches SET
    state='timed_out',error_message='Resposta do pg_net não observada em dois minutos',completed_at=clock_timestamp()
  WHERE state='queued' AND requested_at<clock_timestamp()-interval '2 minutes';
$old_timeout$;
  v_new_timeout text := $new_timeout$
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
$new_timeout$;
BEGIN
  SELECT pg_get_functiondef('public.monitor_sicoob_approval_worker()'::regprocedure)
    INTO v_definition;

  IF v_definition IS NULL
     OR length(v_definition)-length(replace(v_definition,v_old_response,''))<>length(v_old_response)
     OR length(v_definition)-length(replace(v_definition,v_old_timeout,''))<>length(v_old_timeout) THEN
    RAISE EXCEPTION 'Corpo do monitor divergiu do contrato esperado; migration cancelada.';
  END IF;

  v_definition := replace(v_definition,v_old_response,v_new_response);
  v_definition := replace(v_definition,v_old_timeout,v_new_timeout);
  EXECUTE v_definition;
END;
$patch$;
