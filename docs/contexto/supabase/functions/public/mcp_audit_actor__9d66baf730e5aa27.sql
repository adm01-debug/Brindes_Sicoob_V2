CREATE OR REPLACE FUNCTION public.mcp_audit_actor(_fallback uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  jwt_sub text;
  header_actor text;
BEGIN
  -- Header customizado setado pelas edge functions (set_config('request.jwt.claim.sub', ...))
  BEGIN
    header_actor := current_setting('request.mcp_actor', true);
  EXCEPTION WHEN OTHERS THEN
    header_actor := NULL;
  END;
  IF header_actor IS NOT NULL AND header_actor <> '' THEN
    RETURN header_actor::uuid;
  END IF;

  -- JWT padrão Supabase
  IF auth.uid() IS NOT NULL THEN
    RETURN auth.uid();
  END IF;

  BEGIN
    jwt_sub := current_setting('request.jwt.claims', true)::jsonb->>'sub';
  EXCEPTION WHEN OTHERS THEN
    jwt_sub := NULL;
  END;
  IF jwt_sub IS NOT NULL AND jwt_sub <> '' THEN
    RETURN jwt_sub::uuid;
  END IF;

  RETURN _fallback;
END;
$function$
