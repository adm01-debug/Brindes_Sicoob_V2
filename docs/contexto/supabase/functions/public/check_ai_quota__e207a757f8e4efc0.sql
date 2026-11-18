CREATE OR REPLACE FUNCTION public.check_ai_quota(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
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
      OR (status = 'error' AND metadata ->> 'billedOnInterrupt' = 'true')
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
$function$
