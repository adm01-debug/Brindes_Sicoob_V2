CREATE OR REPLACE FUNCTION public.enqueue_sicoob_approval_notifications(p_request_id uuid)
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.enqueue_sicoob_approval_event(p_request_id, 'request_created');
$function$
