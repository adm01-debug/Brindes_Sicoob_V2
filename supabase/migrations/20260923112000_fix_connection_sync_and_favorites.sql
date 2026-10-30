-- Atualiza funções antigas que assumiam a existência permanente do papel admin.
-- A hierarquia Sicoob migrou estes atores para supervisor/dev.
CREATE OR REPLACE FUNCTION public.sync_external_connections_from_credentials(
  _trigger_secret_name text DEFAULT NULL,
  _trigger_op text DEFAULT 'manual',
  _trigger_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  _system_uid uuid;
  _env_keys text[] := ARRAY['promobrind', 'crm'];
  _env_key text;
  _url_name text;
  _anon_name text;
  _svc_name text;
  _has_url boolean;
  _has_svc boolean;
  _status text;
  _name text;
  _processed int := 0;
  _created int := 0;
  _updated int := 0;
  _is_insert boolean;
  _start timestamptz := clock_timestamp();
  _result jsonb;
  _err text;
BEGIN
  SELECT user_id INTO _system_uid
  FROM public.user_roles
  WHERE role IN ('dev', 'supervisor', 'admin', 'manager')
  ORDER BY CASE WHEN user_id = _trigger_user_id THEN 0 ELSE 1 END, created_at ASC
  LIMIT 1;

  IF _system_uid IS NULL THEN
    INSERT INTO public.external_connections_sync_log (
      triggered_by_user_id, triggered_by_secret_name, trigger_op,
      processed, created_count, updated_count, status, error_message, duration_ms
    ) VALUES (
      _trigger_user_id, _trigger_secret_name, COALESCE(_trigger_op, 'manual'),
      0, 0, 0, 'no_admin', 'no_privileged_system_actor',
      EXTRACT(MILLISECONDS FROM (clock_timestamp() - _start))::int
    );
    RETURN jsonb_build_object('ok', false, 'reason', 'no_privileged_system_actor');
  END IF;

  BEGIN
    FOREACH _env_key IN ARRAY _env_keys LOOP
      _url_name := 'EXTERNAL_' || upper(_env_key) || '_URL';
      _anon_name := 'EXTERNAL_' || upper(_env_key) || '_ANON_KEY';
      _svc_name := 'EXTERNAL_' || upper(_env_key) || '_SERVICE_ROLE_KEY';

      SELECT EXISTS (SELECT 1 FROM public.integration_credentials WHERE secret_name = _url_name AND length > 0) INTO _has_url;
      SELECT EXISTS (SELECT 1 FROM public.integration_credentials WHERE secret_name = _svc_name AND length > 0) INTO _has_svc;
      _status := CASE WHEN _has_url AND _has_svc THEN 'active' ELSE 'unconfigured' END;
      _name := CASE _env_key WHEN 'promobrind' THEN 'Catálogo Promobrind' WHEN 'crm' THEN 'CRM Promobrind' ELSE initcap(_env_key) END;

      SELECT NOT EXISTS (
        SELECT 1 FROM public.external_connections WHERE env_key = _env_key AND type = 'supabase'
      ) INTO _is_insert;

      INSERT INTO public.external_connections (
        type, name, env_key, config, secret_refs, status, created_by
      ) VALUES (
        'supabase', _name, _env_key,
        jsonb_build_object('mirrored_from', 'integration_credentials'),
        ARRAY[_url_name, _anon_name, _svc_name], _status, _system_uid
      ) ON CONFLICT (env_key, type) WHERE env_key IS NOT NULL DO UPDATE
      SET status = EXCLUDED.status, secret_refs = EXCLUDED.secret_refs,
          name = EXCLUDED.name, updated_at = now();

      IF _is_insert THEN _created := _created + 1; ELSE _updated := _updated + 1; END IF;
      _processed := _processed + 1;
    END LOOP;

    INSERT INTO public.external_connections_sync_log (
      triggered_by_user_id, triggered_by_secret_name, trigger_op,
      processed, created_count, updated_count, status, duration_ms, details
    ) VALUES (
      _trigger_user_id, _trigger_secret_name, COALESCE(_trigger_op, 'manual'),
      _processed, _created, _updated, 'ok',
      EXTRACT(MILLISECONDS FROM (clock_timestamp() - _start))::int,
      jsonb_build_object('env_keys', _env_keys)
    );
    _result := jsonb_build_object('ok', true, 'processed', _processed, 'created', _created, 'updated', _updated, 'ran_at', now());
    RETURN _result;
  EXCEPTION WHEN OTHERS THEN
    _err := SQLERRM;
    INSERT INTO public.external_connections_sync_log (
      triggered_by_user_id, triggered_by_secret_name, trigger_op,
      processed, created_count, updated_count, status, error_message, duration_ms
    ) VALUES (
      _trigger_user_id, _trigger_secret_name, COALESCE(_trigger_op, 'manual'),
      _processed, _created, _updated, 'error', _err,
      EXTRACT(MILLISECONDS FROM (clock_timestamp() - _start))::int
    );
    RAISE;
  END;
END;
$function$;

DROP POLICY IF EXISTS "Admins read external_connections_sync_log" ON public.external_connections_sync_log;
CREATE POLICY "Supervisores leem external_connections_sync_log"
  ON public.external_connections_sync_log FOR SELECT TO authenticated
  USING (public.is_supervisor_or_above(auth.uid()));

CREATE OR REPLACE FUNCTION public.ensure_default_favorite_list(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE _list_id uuid;
BEGIN
  IF _user_id IS NULL OR (auth.role() <> 'service_role' AND _user_id IS DISTINCT FROM auth.uid()) THEN
    RAISE EXCEPTION 'favorite_list_actor_mismatch' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.favorite_lists (user_id, name, icon, color, is_default, position)
  VALUES (_user_id, 'Meus Favoritos', 'Heart', '#EF4444', true, 0)
  ON CONFLICT (user_id) WHERE is_default DO NOTHING
  RETURNING id INTO _list_id;

  IF _list_id IS NULL THEN
    SELECT id INTO _list_id FROM public.favorite_lists
    WHERE user_id = _user_id AND is_default = true LIMIT 1;
  END IF;
  RETURN _list_id;
END;
$function$;

ALTER FUNCTION public.generate_sicoob_performance_report(text, text)
  SET search_path = pg_catalog, public;
