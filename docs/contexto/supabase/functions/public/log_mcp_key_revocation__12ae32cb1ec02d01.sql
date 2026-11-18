CREATE OR REPLACE FUNCTION public.log_mcp_key_revocation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Dispara apenas quando revoked_at passa de NULL para NOT NULL
  IF OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL THEN
    INSERT INTO public.admin_audit_log (
      user_id,
      action,
      resource_type,
      resource_id,
      details
    ) VALUES (
      COALESCE(auth.uid(), NEW.created_by),
      'mcp_key.revoked',
      'mcp_api_key',
      NEW.id::text,
      jsonb_build_object(
        'key_prefix', NEW.key_prefix,
        'name', NEW.name,
        'scopes', NEW.scopes,
        'is_full_access', '*' = ANY(NEW.scopes),
        'revoked_at', NEW.revoked_at
      )
    );
  END IF;
  RETURN NEW;
END;
$function$
