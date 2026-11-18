CREATE OR REPLACE FUNCTION public.cleanup_discount_test_data()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _seller_id uuid;
  _admin_id uuid;
  _quotes_deleted int := 0;
  _requests_deleted int := 0;
  _notifs_deleted int := 0;
BEGIN
  SELECT user_id INTO _seller_id FROM public.profiles WHERE email = 'seller-test@discount-approval.test' LIMIT 1;
  SELECT user_id INTO _admin_id FROM public.profiles WHERE email = 'admin-test@discount-approval.test' LIMIT 1;

  IF _seller_id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'note', 'no test seller found, nothing to clean');
  END IF;

  -- Delete approval requests for seller-test quotes
  WITH deleted AS (
    DELETE FROM public.discount_approval_requests
    WHERE seller_id = _seller_id
    RETURNING 1
  ) SELECT count(*) INTO _requests_deleted FROM deleted;

  -- Delete quotes from test seller
  WITH deleted AS (
    DELETE FROM public.quotes
    WHERE seller_id = _seller_id
    RETURNING 1
  ) SELECT count(*) INTO _quotes_deleted FROM deleted;

  -- Delete test notifications
  WITH deleted AS (
    DELETE FROM public.workspace_notifications
    WHERE user_id IN (_seller_id, _admin_id)
      AND category IN ('discount', 'quotes')
    RETURNING 1
  ) SELECT count(*) INTO _notifs_deleted FROM deleted;

  RETURN jsonb_build_object(
    'ok', true,
    'requests_deleted', _requests_deleted,
    'quotes_deleted', _quotes_deleted,
    'notifications_deleted', _notifs_deleted
  );
END;
$function$
