CREATE OR REPLACE FUNCTION public.log_rls_denial(p_table_name text, p_operation text, p_endpoint text DEFAULT NULL::text, p_query_summary text DEFAULT NULL::text, p_target_id uuid DEFAULT NULL::uuid, p_target_seller_id uuid DEFAULT NULL::uuid, p_policy_hint text DEFAULT NULL::text, p_error_code text DEFAULT NULL::text, p_error_message text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT;
  v_role TEXT;
  v_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  IF p_operation NOT IN ('SELECT','INSERT','UPDATE','DELETE') THEN
    RAISE EXCEPTION 'invalid_operation';
  END IF;

  -- enriquece com email + papel principal (best-effort)
  SELECT email, role INTO v_email, v_role
  FROM public.profiles
  WHERE user_id = v_uid
  LIMIT 1;

  INSERT INTO public.rls_denial_log (
    user_id, user_email, user_role, table_name, operation,
    endpoint, query_summary, target_id, target_seller_id,
    policy_hint, error_code, error_message, user_agent
  ) VALUES (
    v_uid, v_email, v_role, p_table_name, p_operation,
    p_endpoint, p_query_summary, p_target_id, p_target_seller_id,
    p_policy_hint, p_error_code, p_error_message, p_user_agent
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$
