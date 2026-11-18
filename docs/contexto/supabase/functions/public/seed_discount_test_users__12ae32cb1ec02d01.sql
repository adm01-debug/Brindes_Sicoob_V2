CREATE OR REPLACE FUNCTION public.seed_discount_test_users()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _seller_id uuid;
  _admin_id uuid;
BEGIN
  -- Find existing test users by email in profiles
  SELECT user_id INTO _seller_id FROM public.profiles WHERE email = 'seller-test@discount-approval.test' LIMIT 1;
  SELECT user_id INTO _admin_id FROM public.profiles WHERE email = 'admin-test@discount-approval.test' LIMIT 1;

  -- If users don't exist, return error (auth.users insertion requires Supabase Admin API, not SQL)
  IF _seller_id IS NULL OR _admin_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Test users not found. Create them via Supabase Admin API first.',
      'seller_exists', _seller_id IS NOT NULL,
      'admin_exists', _admin_id IS NOT NULL
    );
  END IF;

  -- Ensure roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_seller_id, 'vendedor')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_admin_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Sync role on profiles
  UPDATE public.profiles SET role = 'vendedor' WHERE user_id = _seller_id;
  UPDATE public.profiles SET role = 'admin' WHERE user_id = _admin_id;

  RETURN jsonb_build_object(
    'ok', true,
    'seller_id', _seller_id,
    'admin_id', _admin_id
  );
END;
$function$
