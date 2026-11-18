CREATE OR REPLACE FUNCTION public.log_order_audit_event(p_order_id uuid, p_event_type text, p_description text, p_metadata jsonb DEFAULT '{}'::jsonb, p_created_by uuid DEFAULT auth.uid(), p_created_by_name text DEFAULT NULL::text, p_category text DEFAULT 'general'::text, p_observations text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_name text;
  v_actor_role text;
  v_event_category text;
  v_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Autenticação obrigatória.';
  END IF;

  IF p_created_by IS NOT NULL AND p_created_by <> v_actor AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Ator de auditoria inválido.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.orders o
     WHERE o.id = p_order_id
       AND (
         o.seller_id = v_actor
         OR public.can_view_all_sales(v_actor)
         OR (
           public.has_role(v_actor, 'supervisor'::public.app_role)
           AND (o.organization_id IS NULL OR o.organization_id IN (
             SELECT public.get_user_org_ids(v_actor)
           ))
         )
       )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Pedido inexistente ou sem acesso.';
  END IF;

  SELECT COALESCE(p_created_by_name, p.full_name, p.email, 'Usuário'), p.role
    INTO v_actor_name, v_actor_role
    FROM public.profiles p
   WHERE p.user_id = v_actor
   LIMIT 1;

  v_actor_name := COALESCE(v_actor_name, p_created_by_name, 'Usuário');
  v_event_category := CASE
    WHEN p_category IN ('status', 'logistics', 'invoice', 'payment', 'pilot', 'comment', 'system')
      THEN p_category
    WHEN p_event_type IN ('status_change', 'status_changed') THEN 'status'
    ELSE 'system'
  END;

  INSERT INTO public.order_audit_events (
    order_id, event_type, event_category, actor_id, actor_name, actor_role,
    description, metadata, created_by_name, category, observations
  ) VALUES (
    p_order_id, p_event_type, v_event_category, v_actor, v_actor_name, v_actor_role,
    p_description, COALESCE(p_metadata, '{}'::jsonb), v_actor_name,
    p_category, p_observations
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$
