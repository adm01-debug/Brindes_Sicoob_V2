CREATE OR REPLACE FUNCTION public.cleanup_expired_step_up()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  DELETE FROM public.step_up_challenges WHERE expires_at < (now() - interval '1 day');
  DELETE FROM public.step_up_tokens WHERE expires_at < (now() - interval '1 day');
$function$
