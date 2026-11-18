CREATE OR REPLACE FUNCTION public.get_user_pa_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT pa_id FROM public.profiles WHERE user_id = auth.uid() OR id = auth.uid() LIMIT 1;
$function$
