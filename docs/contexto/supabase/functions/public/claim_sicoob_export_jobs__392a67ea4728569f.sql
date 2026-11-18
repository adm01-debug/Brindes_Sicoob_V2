CREATE OR REPLACE FUNCTION public.claim_sicoob_export_jobs(p_limit integer DEFAULT 5)
 RETURNS SETOF export_jobs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  WITH candidates AS (
    SELECT id FROM public.export_jobs
    WHERE status IN ('pending', 'failed')
      AND attempts < COALESCE(max_attempts, 3)
    ORDER BY created_at ASC, id ASC
    FOR UPDATE SKIP LOCKED
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 5), 25))
  )
  UPDATE public.export_jobs job
  SET status = 'processing', attempts = COALESCE(job.attempts, 0) + 1,
      error_message = NULL, updated_at = now()
  FROM candidates
  WHERE job.id = candidates.id
  RETURNING job.*;
END;
$function$
