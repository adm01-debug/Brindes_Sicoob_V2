CREATE OR REPLACE FUNCTION public.get_user_cooperative_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT cooperativa_id FROM public.profiles WHERE user_id = auth.uid();
$function$
