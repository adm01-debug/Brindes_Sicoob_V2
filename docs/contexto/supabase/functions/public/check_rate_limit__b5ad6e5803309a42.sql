CREATE OR REPLACE FUNCTION public.check_rate_limit(_identifier text, _endpoint text, _max_requests integer DEFAULT 60, _window_seconds integer DEFAULT 60, _block_duration_seconds integer DEFAULT 3600)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _row record;
  _now timestamptz := now();
  _window_start timestamptz := _now - make_interval(secs => _window_seconds);
BEGIN
  -- Atomic upsert with row lock
  INSERT INTO public.request_rate_limits (identifier, endpoint, request_count, window_start)
  VALUES (_identifier, _endpoint, 1, _now)
  ON CONFLICT (identifier, endpoint) DO UPDATE
  SET 
    request_count = CASE 
      WHEN request_rate_limits.window_start < _window_start THEN 1
      ELSE request_rate_limits.request_count + 1
    END,
    window_start = CASE
      WHEN request_rate_limits.window_start < _window_start THEN _now
      ELSE request_rate_limits.window_start
    END,
    blocked_until = CASE
      WHEN request_rate_limits.blocked_until IS NOT NULL AND request_rate_limits.blocked_until > _now 
        THEN request_rate_limits.blocked_until
      WHEN request_rate_limits.window_start >= _window_start AND request_rate_limits.request_count + 1 > _max_requests
        THEN _now + make_interval(secs => _block_duration_seconds)
      ELSE NULL
    END,
    updated_at = _now
  RETURNING * INTO _row;

  -- Currently blocked?
  IF _row.blocked_until IS NOT NULL AND _row.blocked_until > _now THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'blocked',
      'blocked_until', _row.blocked_until,
      'retry_after_seconds', EXTRACT(EPOCH FROM (_row.blocked_until - _now))::integer
    );
  END IF;

  -- Exceeded limit in current window?
  IF _row.request_count > _max_requests THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_exceeded',
      'count', _row.request_count,
      'limit', _max_requests,
      'retry_after_seconds', _block_duration_seconds
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'count', _row.request_count,
    'limit', _max_requests,
    'remaining', GREATEST(_max_requests - _row.request_count, 0)
  );
END;
$function$
