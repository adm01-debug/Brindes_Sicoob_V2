CREATE OR REPLACE FUNCTION public.complete_optimization(_id uuid, _status text, _notes text DEFAULT NULL::text, _guardrail_status text DEFAULT NULL::text, _result jsonb DEFAULT NULL::jsonb, _error text DEFAULT NULL::text)
 RETURNS optimization_queue
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  updated public.optimization_queue;
  duration int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _status NOT IN ('done','failed','skipped','blocked') THEN
    RAISE EXCEPTION 'invalid status: %', _status;
  END IF;

  UPDATE public.optimization_queue
     SET status = _status,
         finished_at = now(),
         result = COALESCE(_result, result),
         error = _error,
         guardrail_status = COALESCE(_guardrail_status, guardrail_status)
   WHERE id = _id
   RETURNING * INTO updated;

  IF updated.id IS NULL THEN
    RAISE EXCEPTION 'optimization not found';
  END IF;

  duration := EXTRACT(EPOCH FROM (updated.finished_at - COALESCE(updated.started_at, updated.finished_at))) * 1000;

  INSERT INTO public.optimization_queue_runs (queue_id, status, notes, guardrail_status, duration_ms, executed_by)
  VALUES (_id, _status, _notes, _guardrail_status, duration, auth.uid());

  RETURN updated;
END;
$function$
