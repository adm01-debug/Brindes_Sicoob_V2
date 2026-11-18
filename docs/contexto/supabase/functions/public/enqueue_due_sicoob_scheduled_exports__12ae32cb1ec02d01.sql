CREATE OR REPLACE FUNCTION public.enqueue_due_sicoob_scheduled_exports()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE item public.scheduled_exports%ROWTYPE; count_created integer := 0;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501'; END IF;
  FOR item IN
    SELECT * FROM public.scheduled_exports
    WHERE is_active = true AND COALESCE(next_run_at, created_at, now()) <= now()
    ORDER BY COALESCE(next_run_at, created_at), id
    FOR UPDATE SKIP LOCKED
  LOOP
    INSERT INTO public.export_jobs (user_id, entity_type, export_type, filters, status)
    VALUES (item.user_id, item.entity_type, item.export_type, item.filters, 'pending');
    UPDATE public.scheduled_exports SET last_run_at = now(), next_run_at = now() + CASE item.frequency
      WHEN 'daily' THEN interval '1 day' WHEN 'weekly' THEN interval '1 week' ELSE interval '1 month' END,
      updated_at = now() WHERE id = item.id;
    count_created := count_created + 1;
  END LOOP;
  RETURN count_created;
END;
$function$
