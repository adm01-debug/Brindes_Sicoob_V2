CREATE OR REPLACE FUNCTION public.can_manage_quote_scope(p_actor_id uuid, p_quote_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT public.sicoob_actor_is_active(p_actor_id)
    AND EXISTS (
      SELECT 1
      FROM public.quotes q
      WHERE q.id = p_quote_id
        AND (
          public.has_role(p_actor_id, 'admin'::public.app_role)
          OR public.has_role(p_actor_id, 'dev'::public.app_role)
          OR (
            (
              public.has_role(p_actor_id, 'manager'::public.app_role)
              OR public.has_role(p_actor_id, 'supervisor'::public.app_role)
            )
            AND (
              (q.organization_id IS NOT NULL AND q.organization_id IN (
                SELECT public.get_user_org_ids(p_actor_id)
              ))
              OR q.singular_id = (
                SELECT p.cooperativa_id
                FROM public.profiles p
                WHERE p.user_id = p_actor_id
                  AND p.is_active IS TRUE
                  AND p.deleted_at IS NULL
                LIMIT 1
              )
              OR q.pa_id = (
                SELECT p.pa_id
                FROM public.profiles p
                WHERE p.user_id = p_actor_id
                  AND p.is_active IS TRUE
                  AND p.deleted_at IS NULL
                LIMIT 1
              )
            )
          )
          OR (
            (
              public.has_role(p_actor_id, 'comprador_singular'::public.app_role)
              OR public.has_role(p_actor_id, 'gestor_compras'::public.app_role)
            )
            AND EXISTS (
              SELECT 1
              FROM public.profiles p
              WHERE p.user_id = p_actor_id
                AND p.cooperativa_id = q.singular_id
                AND p.is_active IS TRUE
                AND p.deleted_at IS NULL
            )
          )
        )
    );
$function$
