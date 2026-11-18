CREATE OR REPLACE FUNCTION public.sicoob_actor_has_active_approval_delegation(p_actor_id uuid, p_order_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.sicoob_approval_delegations delegation
    JOIN public.sicoob_orders order_row ON order_row.id=p_order_id
    JOIN public.profiles delegate_profile
      ON delegate_profile.user_id=p_actor_id OR delegate_profile.id=p_actor_id
    WHERE delegation.delegate_id=p_actor_id
      AND delegation.revoked_at IS NULL
      AND delegation.starts_at <= statement_timestamp()
      AND delegation.ends_at > statement_timestamp()
      AND delegation.competencies && ARRAY['approve_order', 'reject_order']::text[]
      AND delegation.cooperative_id=order_row.cooperative_id
      AND (delegation.pa_id IS NULL OR delegation.pa_id=order_row.pa_id)
      AND delegate_profile.is_active IS TRUE
      AND delegate_profile.deleted_at IS NULL
      AND delegate_profile.cooperativa_id=delegation.cooperative_id
      AND (delegation.pa_id IS NULL OR delegate_profile.pa_id=delegation.pa_id)
      AND public.sicoob_actor_can_approve(
        delegation.delegator_id,
        p_order_id,
        order_row.status='escalated_to_board'
      )
  );
$function$
