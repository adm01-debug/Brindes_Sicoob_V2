CREATE OR REPLACE FUNCTION public.claim_next_optimization()
 RETURNS optimization_queue
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  claimed public.optimization_queue;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Bloqueia se já existe um running
  IF EXISTS (SELECT 1 FROM public.optimization_queue WHERE status = 'running') THEN
    RETURN NULL;
  END IF;

  UPDATE public.optimization_queue
     SET status = 'running', started_at = now()
   WHERE id = (
     SELECT id FROM public.optimization_queue
      WHERE status = 'pending'
      ORDER BY priority ASC, created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
   )
   RETURNING * INTO claimed;

  RETURN claimed;
END;
$function$
