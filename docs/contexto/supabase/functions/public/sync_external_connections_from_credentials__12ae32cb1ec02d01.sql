CREATE OR REPLACE FUNCTION public.sync_external_connections_from_credentials()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _system_uid uuid;
  _env_keys text[] := ARRAY['promobrind', 'crm'];
  _env_key text;
  _url_name text;
  _anon_name text;
  _svc_name text;
  _has_url boolean;
  _has_anon boolean;
  _has_svc boolean;
  _status text;
  _name text;
  _processed int := 0;
BEGIN
  -- Ator de sistema: qualquer admin (created_by é NOT NULL)
  SELECT user_id INTO _system_uid
  FROM public.user_roles
  WHERE role = 'admin'
  LIMIT 1;

  IF _system_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_admin_for_system_actor');
  END IF;

  FOREACH _env_key IN ARRAY _env_keys LOOP
    _url_name  := 'EXTERNAL_' || upper(_env_key) || '_URL';
    _anon_name := 'EXTERNAL_' || upper(_env_key) || '_ANON_KEY';
    _svc_name  := 'EXTERNAL_' || upper(_env_key) || '_SERVICE_ROLE_KEY';

    SELECT EXISTS (SELECT 1 FROM public.integration_credentials WHERE secret_name = _url_name  AND length > 0) INTO _has_url;
    SELECT EXISTS (SELECT 1 FROM public.integration_credentials WHERE secret_name = _anon_name AND length > 0) INTO _has_anon;
    SELECT EXISTS (SELECT 1 FROM public.integration_credentials WHERE secret_name = _svc_name  AND length > 0) INTO _has_svc;

    IF _has_url AND _has_anon AND _has_svc THEN
      _status := 'active';
    ELSE
      _status := 'unconfigured';
    END IF;

    _name := CASE _env_key
      WHEN 'promobrind' THEN 'Catálogo Promobrind'
      WHEN 'crm' THEN 'CRM Promobrind'
      ELSE initcap(_env_key)
    END;

    INSERT INTO public.external_connections (
      type, name, env_key, config, secret_refs, status, created_by
    ) VALUES (
      'supabase',
      _name,
      _env_key,
      jsonb_build_object('mirrored_from', 'integration_credentials'),
      ARRAY[_url_name, _anon_name, _svc_name],
      _status,
      _system_uid
    )
    ON CONFLICT (env_key, type) WHERE env_key IS NOT NULL DO UPDATE
    SET status = EXCLUDED.status,
        secret_refs = EXCLUDED.secret_refs,
        name = EXCLUDED.name,
        updated_at = now();

    _processed := _processed + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'processed', _processed, 'ran_at', now());
END;
$function$
