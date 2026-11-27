CREATE OR REPLACE FUNCTION public.cooperativa_verba_distribuida(p_cooperativa_id uuid, p_ano integer, p_mes integer)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public._pode_ver_verba_da_cooperativa(p_cooperativa_id) IS NOT TRUE THEN
    RAISE EXCEPTION 'Sem permissao para consultar a verba desta cooperativa.'
      USING ERRCODE = '42501';
  END IF;

  RETURN public._cooperativa_verba_distribuida(p_cooperativa_id, p_ano, p_mes);
END;
$function$
