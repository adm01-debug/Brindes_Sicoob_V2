CREATE OR REPLACE FUNCTION public.assert_quote_transition(p_actor_id uuid, p_quote quotes, p_new_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_actor_is_active boolean := public.sicoob_actor_is_active(p_actor_id);
  v_is_seller boolean := v_actor_is_active AND p_quote.seller_id = p_actor_id;
  v_is_manager boolean := public.can_manage_quote_scope(p_actor_id, p_quote.id);
  v_is_singular_buyer boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.user_id = p_actor_id
      AND profile.cooperativa_id = p_quote.singular_id
      AND profile.is_active IS TRUE
      AND profile.deleted_at IS NULL
      AND (
        public.has_role(p_actor_id, 'comprador_singular'::public.app_role)
        OR public.has_role(p_actor_id, 'gestor_compras'::public.app_role)
      )
  ) INTO v_is_singular_buyer;

  IF p_quote.deleted_at IS NOT NULL
     OR COALESCE(p_quote.is_latest_version, true) IS NOT TRUE THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'O orçamento não está disponível para transição.';
  END IF;

  IF p_quote.status::text = p_new_status THEN
    RETURN;
  END IF;

  IF v_is_seller AND (
    (p_quote.status::text IN ('draft', 'revision', 'rejected', 'rejected_singular', 'expired')
      AND p_new_status = 'draft')
    OR (p_quote.status::text = 'draft'
      AND p_new_status IN ('pending', 'sent', 'pending_singular_approval'))
    OR (p_quote.status::text = 'pending' AND p_new_status = 'sent')
  ) THEN
    RETURN;
  END IF;

  IF v_is_manager
     AND p_new_status = 'rejected'
     AND p_quote.status::text IN ('pending', 'sent') THEN
    RETURN;
  END IF;

  IF (v_is_singular_buyer OR v_is_manager)
     AND p_quote.status::text = 'pending_singular_approval'
     AND p_new_status IN ('approved_singular', 'rejected_singular') THEN
    RETURN;
  END IF;

  RAISE EXCEPTION USING
    ERRCODE = '42501',
    MESSAGE = 'A transição de status não é permitida para este ator e orçamento.';
END;
$function$
