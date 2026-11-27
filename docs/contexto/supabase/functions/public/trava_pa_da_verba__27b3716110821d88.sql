CREATE OR REPLACE FUNCTION public._trava_pa_da_verba(p_pa_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 1 FROM public.postos_atendimento pa WHERE pa.id = p_pa_id FOR SHARE;
$function$
