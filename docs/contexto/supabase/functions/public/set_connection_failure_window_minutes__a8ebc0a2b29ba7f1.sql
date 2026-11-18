CREATE OR REPLACE FUNCTION public.set_connection_failure_window_minutes(minutes integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  IF minutes NOT IN (0, 15, 30, 60, 120, 240) THEN
    RAISE EXCEPTION 'invalid window: must be one of 0, 15, 30, 60, 120, 240 minutes';
  END IF;

  INSERT INTO public.system_settings (key, value, updated_by, updated_at)
  VALUES ('connection_failure_window_minutes', to_jsonb(minutes), auth.uid(), now())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_by = EXCLUDED.updated_by,
        updated_at = EXCLUDED.updated_at;

  INSERT INTO public.admin_audit_log (user_id, action, resource_type, resource_id, details)
  VALUES (
    auth.uid(),
    'connection_failure_window_changed',
    'system_setting',
    'connection_failure_window_minutes',
    jsonb_build_object('minutes', minutes)
  );

  RETURN minutes;
END;
$function$
