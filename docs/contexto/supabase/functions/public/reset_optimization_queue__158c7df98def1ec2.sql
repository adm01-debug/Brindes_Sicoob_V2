CREATE OR REPLACE FUNCTION public.reset_optimization_queue(_only_running boolean DEFAULT true)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  affected int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _only_running THEN
    UPDATE public.optimization_queue
       SET status = 'pending', started_at = NULL
     WHERE status = 'running';
  ELSE
    UPDATE public.optimization_queue
       SET status = 'pending', started_at = NULL, finished_at = NULL, error = NULL
     WHERE status IN ('running','failed','blocked');
  END IF;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$function$
