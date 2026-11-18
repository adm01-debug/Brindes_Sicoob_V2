CREATE OR REPLACE FUNCTION public.is_gestor_compras(_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT public.has_role(_user_id, 'gestor_compras'::public.app_role);
$function$
