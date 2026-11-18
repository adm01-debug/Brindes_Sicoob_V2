CREATE OR REPLACE FUNCTION public.queue_sicoob_approval_escalation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF COALESCE((OLD.metadata->>'escalated')::boolean, false) IS FALSE
     AND COALESCE((NEW.metadata->>'escalated')::boolean, false) IS TRUE THEN
    PERFORM public.enqueue_sicoob_approval_event(NEW.id, 'escalated_to_board');
  END IF;
  RETURN NEW;
END;
$function$
