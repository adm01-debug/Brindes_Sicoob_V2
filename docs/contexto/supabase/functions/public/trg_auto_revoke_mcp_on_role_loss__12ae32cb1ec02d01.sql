CREATE OR REPLACE FUNCTION public.trg_auto_revoke_mcp_on_role_loss()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _now TIMESTAMP WITH TIME ZONE := now();
  _rec RECORD;
BEGIN
  -- Só agimos quando uma role 'dev' é removida E o usuário não tem outra linha 'dev'
  IF OLD.role IS DISTINCT FROM 'dev'::app_role THEN
    RETURN OLD;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = OLD.user_id AND role = 'dev'::app_role
  ) THEN
    -- Ainda é dev por outra atribuição: nada a fazer
    RETURN OLD;
  END IF;

  FOR _rec IN
    SELECT id FROM public.mcp_api_keys
     WHERE created_by = OLD.user_id
       AND revoked_at IS NULL
       AND '*' = ANY(scopes)
     FOR UPDATE
  LOOP
    UPDATE public.mcp_api_keys
       SET revoked_at = _now, updated_at = _now
     WHERE id = _rec.id AND revoked_at IS NULL;

    INSERT INTO public.mcp_key_auto_revocations(key_id, created_by, revoked_at, source, reason)
    VALUES (_rec.id, OLD.user_id, _now, 'trigger', 'creator_lost_dev_role');

    INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, metadata)
    VALUES (
      OLD.user_id,
      'mcp_full_issue',
      _rec.id::text,
      'auto_revoked',
      jsonb_build_object('reason','creator_lost_dev_role','source','trigger')
    );
  END LOOP;

  RETURN OLD;
END;
$function$
