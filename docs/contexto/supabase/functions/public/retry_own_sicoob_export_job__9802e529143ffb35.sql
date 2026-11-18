CREATE OR REPLACE FUNCTION public.retry_own_sicoob_export_job(p_job_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501'; END IF;
  UPDATE public.export_jobs
  SET status = 'pending', attempts = 0, error_message = NULL, updated_at = now()
  WHERE id = p_job_id AND user_id = auth.uid() AND status = 'failed';
  IF NOT FOUND THEN RAISE EXCEPTION 'export_job_not_retryable' USING ERRCODE = '42501'; END IF;
  RETURN true;
END;
$function$
