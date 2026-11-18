CREATE OR REPLACE FUNCTION public.auto_revoke_orphan_full_keys(_source text DEFAULT 'cron'::text)
 RETURNS TABLE(key_id uuid, created_by uuid, revoked_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _now TIMESTAMP WITH TIME ZONE := now();
  _rec RECORD;
BEGIN
  IF _source NOT IN ('trigger','cron','manual') THEN
    RAISE EXCEPTION 'invalid source: %', _source USING ERRCODE = '22023';
  END IF;

  FOR _rec IN
    SELECT k.id, k.created_by
      FROM public.mcp_api_keys k
     WHERE k.revoked_at IS NULL
       AND '*' = ANY(k.scopes)
       AND NOT public.is_dev(k.created_by)
     FOR UPDATE
  LOOP
    -- Revoga a chave (trigger existente log_mcp_key_revocation registra a mudança)
    UPDATE public.mcp_api_keys
       SET revoked_at = _now,
           updated_at = _now
     WHERE mcp_api_keys.id = _rec.id
       AND mcp_api_keys.revoked_at IS NULL;

    -- Log dedicado do mecanismo de defesa
    INSERT INTO public.mcp_key_auto_revocations(key_id, created_by, revoked_at, source, reason)
    VALUES (_rec.id, _rec.created_by, _now, _source, 'creator_lost_dev_role');

    -- Correlação forense no audit log de step-up (mesma trilha das emissões FULL)
    INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, metadata)
    VALUES (
      _rec.created_by,
      'mcp_full_issue',
      _rec.id::text,
      'auto_revoked',
      jsonb_build_object(
        'reason', 'creator_lost_dev_role',
        'source', _source
      )
    );

    key_id := _rec.id;
    created_by := _rec.created_by;
    revoked_at := _now;
    RETURN NEXT;
  END LOOP;
END;
$function$
