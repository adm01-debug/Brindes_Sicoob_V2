CREATE OR REPLACE FUNCTION public.capture_sicoob_order_approval_policy()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_policy record;
  v_protected_statuses constant text[] := ARRAY[
    'waiting_approval', 'escalated_to_board', 'confirmed', 'logistic',
    'in_production', 'in_separation', 'in_transit', 'delivered',
    'completed', 'cancelled'
  ];
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = ANY(v_protected_statuses) THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'O pedido deve entrar no fluxo de aprovação por uma transição formal.';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'rejected' AND NEW.status IN ('draft', 'pending') THEN
    NEW.approval_policy_id := NULL;
    NEW.approval_policy_version := NULL;
    NEW.approval_policy_snapshot := NULL;
    RETURN NEW;
  END IF;

  IF OLD.status = ANY(v_protected_statuses)
     AND (
       NEW.approval_policy_id IS DISTINCT FROM OLD.approval_policy_id
       OR NEW.approval_policy_version IS DISTINCT FROM OLD.approval_policy_version
       OR NEW.approval_policy_snapshot IS DISTINCT FROM OLD.approval_policy_snapshot
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'A política aplicada ao pedido é imutável depois da submissão.';
  END IF;

  IF NOT (OLD.status = ANY(v_protected_statuses))
     AND NEW.status = ANY(v_protected_statuses) THEN
    SELECT * INTO v_policy
      FROM public.get_sicoob_order_approval_policy(OLD.id);

    NEW.approval_policy_id := v_policy.policy_id;
    NEW.approval_policy_version := v_policy.policy_version;
    NEW.approval_policy_snapshot := jsonb_build_object(
      'policy_id', v_policy.policy_id,
      'version', v_policy.policy_version,
      'forbid_self_approval', v_policy.forbid_self_approval,
      'require_active_membership', v_policy.require_active_membership,
      'captured_at', now()
    );
  ELSIF NOT (OLD.status = ANY(v_protected_statuses))
        AND (
          NEW.approval_policy_id IS DISTINCT FROM OLD.approval_policy_id
          OR NEW.approval_policy_version IS DISTINCT FROM OLD.approval_policy_version
          OR NEW.approval_policy_snapshot IS DISTINCT FROM OLD.approval_policy_snapshot
        ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'A política só pode ser definida pela transição formal de submissão.';
  END IF;

  RETURN NEW;
END;
$function$
