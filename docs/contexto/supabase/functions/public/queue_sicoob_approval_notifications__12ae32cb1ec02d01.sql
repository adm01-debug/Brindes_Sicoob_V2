CREATE OR REPLACE FUNCTION public.queue_sicoob_approval_notifications()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.enqueue_sicoob_approval_event(NEW.id, 'request_created');
  RETURN NEW;
END;
$function$
