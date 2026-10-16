-- Torna a cota de IA fail-closed, cobre todos os papéis canônicos e impede
-- consulta BOLA do consumo de outro usuário.

INSERT INTO public.ai_usage_quotas (role, monthly_limit, is_unlimited)
VALUES
  ('admin', 0, true),
  ('dev', 0, true),
  ('manager', 500, false),
  ('supervisor', 500, false),
  ('gestor_compras', 300, false),
  ('gerente_pa', 200, false),
  ('vendedor', 100, false),
  ('comprador_pac', 100, false),
  ('comprador_singular', 100, false)
ON CONFLICT (role) DO NOTHING;

CREATE OR REPLACE FUNCTION public.check_ai_quota(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_monthly_limit integer;
  v_is_unlimited boolean;
  v_used integer;
BEGIN
  IF auth.role() <> 'service_role' AND _user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'ai_quota_actor_mismatch' USING ERRCODE = '42501';
  END IF;

  SELECT quota.monthly_limit, quota.is_unlimited
  INTO v_monthly_limit, v_is_unlimited
  FROM public.user_roles AS membership
  JOIN public.ai_usage_quotas AS quota ON quota.role = membership.role
  WHERE membership.user_id = _user_id
  ORDER BY quota.is_unlimited DESC, quota.monthly_limit DESC, quota.role::text
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false, 'used', 0, 'limit', 0, 'remaining', 0,
      'reason', 'quota_not_configured'
    );
  END IF;

  SELECT count(*)::integer
  INTO v_used
  FROM public.ai_usage_logs
  WHERE user_id = _user_id
    AND created_at >= date_trunc('month', statement_timestamp())
    AND (
      status = 'success'
      OR (status = 'pending' AND created_at >= statement_timestamp() - interval '15 minutes')
    );

  IF v_is_unlimited THEN
    RETURN jsonb_build_object(
      'allowed', true, 'used', v_used, 'limit', -1, 'remaining', -1,
      'unlimited', true
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_used < v_monthly_limit,
    'used', v_used,
    'limit', v_monthly_limit,
    'remaining', greatest(v_monthly_limit - v_used, 0),
    'unlimited', false
  );
END
$function$;

CREATE OR REPLACE FUNCTION public.acquire_ai_quota(
  _user_id uuid,
  _function_name text,
  _model text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_quota_id uuid;
  v_monthly_limit integer;
  v_is_unlimited boolean;
  v_used integer;
  v_log_id uuid;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'ai_quota_service_only' USING ERRCODE = '42501';
  END IF;

  SELECT quota.id, quota.monthly_limit, quota.is_unlimited
  INTO v_quota_id, v_monthly_limit, v_is_unlimited
  FROM public.user_roles AS membership
  JOIN public.ai_usage_quotas AS quota ON quota.role = membership.role
  WHERE membership.user_id = _user_id
  ORDER BY quota.is_unlimited DESC, quota.monthly_limit DESC, quota.role::text
  LIMIT 1
  FOR UPDATE OF quota;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false, 'log_id', null, 'used', 0, 'limit', 0,
      'remaining', 0, 'reason', 'quota_not_configured'
    );
  END IF;

  SELECT count(*)::integer
  INTO v_used
  FROM public.ai_usage_logs
  WHERE user_id = _user_id
    AND created_at >= date_trunc('month', statement_timestamp())
    AND (
      status = 'success'
      OR (status = 'pending' AND created_at >= statement_timestamp() - interval '15 minutes')
    );

  IF NOT v_is_unlimited AND v_used >= v_monthly_limit THEN
    RETURN jsonb_build_object(
      'allowed', false, 'log_id', null, 'used', v_used,
      'limit', v_monthly_limit, 'remaining', 0
    );
  END IF;

  INSERT INTO public.ai_usage_logs (user_id, function_name, model, status)
  VALUES (_user_id, left(_function_name, 120), left(_model, 120), 'pending')
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object(
    'allowed', true,
    'log_id', v_log_id,
    'used', v_used + 1,
    'limit', CASE WHEN v_is_unlimited THEN -1 ELSE v_monthly_limit END,
    'remaining', CASE
      WHEN v_is_unlimited THEN -1
      ELSE greatest(v_monthly_limit - v_used - 1, 0)
    END,
    'unlimited', v_is_unlimited
  );
END
$function$;

REVOKE ALL ON FUNCTION public.check_ai_quota(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_ai_quota(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.acquire_ai_quota(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_ai_quota(uuid, text, text) TO service_role;

DO $assert$
BEGIN
  IF (SELECT count(*) FROM public.ai_usage_quotas) < 9 THEN
    RAISE EXCEPTION 'Contrato inválido: cotas de IA não cobrem todos os papéis canônicos.';
  END IF;

  IF pg_catalog.has_function_privilege(
    'authenticated', 'public.acquire_ai_quota(uuid, text, text)', 'EXECUTE'
  ) OR pg_catalog.has_function_privilege(
    'anon', 'public.check_ai_quota(uuid)', 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Contrato inválido: ACL das funções de cota de IA está excessiva.';
  END IF;
END
$assert$;
