CREATE OR REPLACE FUNCTION public.get_sicoob_order_approval_policy(p_order_id uuid)
 RETURNS TABLE(policy_id uuid, policy_version text, forbid_self_approval boolean, require_active_membership boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH target AS (
    SELECT id,
           cooperative_id,
           approval_policy_id,
           approval_policy_snapshot
      FROM public.sicoob_orders
     WHERE id = p_order_id
  ), candidates AS (
    -- A fotografia gravada na submissão é a fonte de verdade da decisão.
    SELECT NULLIF(t.approval_policy_snapshot ->> 'policy_id', '')::uuid AS policy_id,
           t.approval_policy_snapshot ->> 'version' AS policy_version,
           COALESCE((t.approval_policy_snapshot ->> 'forbid_self_approval')::boolean, true) AS forbid_self_approval,
           COALESCE((t.approval_policy_snapshot ->> 'require_active_membership')::boolean, true) AS require_active_membership,
           4 AS priority,
           NULL::timestamptz AS effective_from
      FROM target t
     WHERE t.approval_policy_snapshot IS NOT NULL

    UNION ALL

    -- Compatibilidade com pedidos antigos que guardavam somente a referência.
    SELECT p.id,
           p.version,
           p.forbid_self_approval,
           p.require_active_membership,
           3,
           p.effective_from
      FROM public.sicoob_approval_policies p
      JOIN target t ON p.id = t.approval_policy_id
     WHERE t.approval_policy_snapshot IS NULL

    UNION ALL

    -- Uma política da cooperativa sempre vence uma política global, mesmo que
    -- esta última tenha effective_from mais recente.
    SELECT p.id,
           p.version,
           p.forbid_self_approval,
           p.require_active_membership,
           2,
           p.effective_from
      FROM public.sicoob_approval_policies p
      JOIN target t ON t.approval_policy_id IS NULL
                   AND t.approval_policy_snapshot IS NULL
     WHERE p.cooperative_id = t.cooperative_id
       AND p.is_active
       AND p.effective_from <= now()
       AND (p.effective_until IS NULL OR p.effective_until > now())

    UNION ALL

    SELECT p.id,
           p.version,
           p.forbid_self_approval,
           p.require_active_membership,
           1,
           p.effective_from
      FROM public.sicoob_approval_policies p
      JOIN target t ON t.approval_policy_id IS NULL
                   AND t.approval_policy_snapshot IS NULL
     WHERE p.cooperative_id IS NULL
       AND p.is_active
       AND p.effective_from <= now()
       AND (p.effective_until IS NULL OR p.effective_until > now())

    UNION ALL

    SELECT NULL::uuid,
           'baseline-tecnica-v1'::text,
           true,
           true,
           0,
           NULL::timestamptz
  )
  SELECT policy_id,
         policy_version,
         forbid_self_approval,
         require_active_membership
    FROM candidates
   ORDER BY priority DESC, effective_from DESC NULLS LAST, policy_id
   LIMIT 1;
$function$
