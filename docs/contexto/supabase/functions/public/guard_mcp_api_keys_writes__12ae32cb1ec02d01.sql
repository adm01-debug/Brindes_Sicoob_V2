CREATE OR REPLACE FUNCTION public.guard_mcp_api_keys_writes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role TEXT := current_setting('role', true);
  v_actor UUID := auth.uid();
BEGIN
  -- Se for service_role (edge functions), permite normalmente
  IF v_role = 'service_role' OR current_user = 'service_role' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Caso contrário, registra violação e bloqueia
  PERFORM public.record_mcp_access_violation(
    v_actor,
    'unauthorized_direct_write',
    'db_trigger:mcp_api_keys',
    TG_OP,
    COALESCE(NEW.id, OLD.id),
    NULL,
    NULL,
    NULL,
    jsonb_build_object('current_user', current_user, 'role', v_role)
  );

  RAISE EXCEPTION 'Direct writes to mcp_api_keys are not allowed';
END;
$function$
