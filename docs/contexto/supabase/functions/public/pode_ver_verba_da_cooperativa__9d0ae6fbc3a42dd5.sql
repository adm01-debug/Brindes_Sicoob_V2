CREATE OR REPLACE FUNCTION public._pode_ver_verba_da_cooperativa(p_cooperativa_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    auth.uid() IS NULL
    OR public.is_admin(auth.uid())
    OR (p_cooperativa_id IS NOT NULL
        AND p_cooperativa_id = public.current_user_cooperativa_id()
        AND (public.has_role(auth.uid(), 'gestor_compras'::public.app_role)
             OR public.has_role(auth.uid(), 'comprador_singular'::public.app_role))),
    false
  );
$function$
