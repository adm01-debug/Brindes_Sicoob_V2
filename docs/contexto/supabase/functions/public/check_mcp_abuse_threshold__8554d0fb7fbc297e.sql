CREATE OR REPLACE FUNCTION public.check_mcp_abuse_threshold(_user_id uuid, _ip text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_window INTERVAL := INTERVAL '10 minutes';
  v_threshold INTEGER := 5;
  v_count_user INTEGER := 0;
  v_count_ip INTEGER := 0;
  v_admin RECORD;
  v_already_alerted BOOLEAN := false;
BEGIN
  -- Conta violações na janela
  IF _user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count_user
    FROM public.mcp_access_violations
    WHERE user_id = _user_id
      AND created_at >= now() - v_window;
  END IF;

  IF _ip IS NOT NULL AND _ip <> '' THEN
    SELECT COUNT(*) INTO v_count_ip
    FROM public.mcp_access_violations
    WHERE ip_address = _ip
      AND created_at >= now() - v_window;
  END IF;

  IF v_count_user < v_threshold AND v_count_ip < v_threshold THEN
    RETURN;
  END IF;

  -- Evita disparos duplicados: se já houver alerta nos últimos 10min para mesmo user/ip, sai
  SELECT EXISTS (
    SELECT 1 FROM public.admin_audit_log
    WHERE action = 'mcp_abuse_detected'
      AND created_at >= now() - v_window
      AND (
        (details->>'user_id') = _user_id::text
        OR (details->>'ip_address') = _ip
      )
  ) INTO v_already_alerted;

  IF v_already_alerted THEN
    RETURN;
  END IF;

  -- Registra evento de auditoria
  INSERT INTO public.admin_audit_log (
    user_id, action, resource_type, resource_id,
    ip_address, details, source, status
  ) VALUES (
    COALESCE(_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
    'mcp_abuse_detected',
    'mcp_api_keys',
    NULL,
    _ip,
    jsonb_build_object(
      'user_id', _user_id,
      'ip_address', _ip,
      'window_minutes', 10,
      'threshold', v_threshold,
      'violations_user', v_count_user,
      'violations_ip', v_count_ip
    ),
    'mcp_abuse_detector',
    'denied'
  );

  -- Notifica admins
  FOR v_admin IN
    SELECT user_id FROM public.user_roles WHERE role = 'admin'::public.app_role
  LOOP
    INSERT INTO public.workspace_notifications (
      user_id, title, message, type, category, action_url, metadata
    ) VALUES (
      v_admin.user_id,
      'Possível abuso em chaves MCP',
      format(
        'Detectadas %s tentativas bloqueadas em 10 min%s.',
        GREATEST(v_count_user, v_count_ip),
        CASE WHEN _ip IS NOT NULL THEN ' (IP: ' || _ip || ')' ELSE '' END
      ),
      'warning',
      'security',
      '/admin/seguranca',
      jsonb_build_object(
        'event', 'mcp_abuse_detected',
        'user_id', _user_id,
        'ip_address', _ip,
        'violations_user', v_count_user,
        'violations_ip', v_count_ip
      )
    );
  END LOOP;
END;
$function$
