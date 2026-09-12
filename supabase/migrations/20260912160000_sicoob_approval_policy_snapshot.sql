-- Preserva a regra efetivamente aplicada a cada pedido e fecha alterações de
-- valor/itens depois da submissão formal. Políticas específicas da cooperativa
-- sempre têm precedência sobre a política global vigente.

ALTER TABLE public.sicoob_orders
  ADD COLUMN IF NOT EXISTS approval_policy_snapshot jsonb;

CREATE OR REPLACE FUNCTION public.get_sicoob_order_approval_policy(p_order_id uuid)
RETURNS TABLE (
  policy_id uuid,
  policy_version text,
  forbid_self_approval boolean,
  require_active_membership boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.get_sicoob_order_approval_policy(uuid) FROM PUBLIC;

-- Versões publicadas são append-only. A Central pode apenas encerrar a
-- vigência ou desativar uma versão para novas submissões.
CREATE OR REPLACE FUNCTION public.protect_sicoob_approval_policy_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Políticas de aprovação publicadas não podem ser excluídas.';
  END IF;

  IF NEW.cooperative_id IS DISTINCT FROM OLD.cooperative_id
     OR NEW.version IS DISTINCT FROM OLD.version
     OR NEW.effective_from IS DISTINCT FROM OLD.effective_from
     OR NEW.forbid_self_approval IS DISTINCT FROM OLD.forbid_self_approval
     OR NEW.require_active_membership IS DISTINCT FROM OLD.require_active_membership THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'A versão publicada da política é imutável; crie uma nova versão.';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_sicoob_approval_policy_version() FROM PUBLIC;

DROP TRIGGER IF EXISTS tr_protect_sicoob_approval_policy_version ON public.sicoob_approval_policies;
CREATE TRIGGER tr_protect_sicoob_approval_policy_version
BEFORE UPDATE OR DELETE ON public.sicoob_approval_policies
FOR EACH ROW
EXECUTE FUNCTION public.protect_sicoob_approval_policy_version();

-- Registra a política na primeira entrada no fluxo protegido e impede que a
-- referência seja trocada depois. Ao reabrir uma rejeição, a nova submissão
-- receberá a política então vigente.
CREATE OR REPLACE FUNCTION public.capture_sicoob_order_approval_policy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.capture_sicoob_order_approval_policy() FROM PUBLIC;

-- Preenche instalações que já possuam pedidos submetidos. A fotografia usa a
-- versão vinculada; sem vínculo, preserva a base técnica registrada no pedido.
UPDATE public.sicoob_orders o
   SET approval_policy_snapshot = jsonb_build_object(
     'policy_id', p.id,
     'version', COALESCE(o.approval_policy_version, p.version, 'baseline-tecnica-v1'),
     'forbid_self_approval', COALESCE(p.forbid_self_approval, true),
     'require_active_membership', COALESCE(p.require_active_membership, true),
     'captured_at', COALESCE(o.updated_at, o.created_at, now()),
     'backfilled', true
   )
  FROM public.sicoob_approval_policies p
 WHERE o.approval_policy_snapshot IS NULL
   AND p.id = o.approval_policy_id
   AND o.status IN (
     'waiting_approval', 'escalated_to_board', 'confirmed', 'logistic',
     'in_production', 'in_separation', 'in_transit', 'delivered',
     'completed', 'cancelled'
   );

UPDATE public.sicoob_orders o
   SET approval_policy_snapshot = jsonb_build_object(
     'policy_id', NULL,
     'version', COALESCE(o.approval_policy_version, 'baseline-tecnica-v1'),
     'forbid_self_approval', true,
     'require_active_membership', true,
     'captured_at', COALESCE(o.updated_at, o.created_at, now()),
     'backfilled', true
   )
 WHERE o.approval_policy_snapshot IS NULL
   AND o.status IN (
     'waiting_approval', 'escalated_to_board', 'confirmed', 'logistic',
     'in_production', 'in_separation', 'in_transit', 'delivered',
     'completed', 'cancelled'
   );

DROP TRIGGER IF EXISTS tr_capture_sicoob_order_approval_policy ON public.sicoob_orders;
CREATE TRIGGER tr_capture_sicoob_order_approval_policy
BEFORE INSERT OR UPDATE ON public.sicoob_orders
FOR EACH ROW
EXECUTE FUNCTION public.capture_sicoob_order_approval_policy();

CREATE OR REPLACE FUNCTION public.freeze_sicoob_order_while_approval_pending()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_order_id uuid := CASE
    WHEN TG_TABLE_NAME = 'sicoob_orders' THEN (to_jsonb(OLD) ->> 'id')::uuid
    ELSE NULLIF(to_jsonb(OLD) ->> 'order_id', '')::uuid
  END;
  v_new_order_id uuid := CASE
    WHEN TG_TABLE_NAME = 'sicoob_orders' THEN (to_jsonb(NEW) ->> 'id')::uuid
    ELSE NULLIF(to_jsonb(NEW) ->> 'order_id', '')::uuid
  END;
BEGIN
  IF EXISTS (
    SELECT 1
      FROM public.sicoob_orders o
     WHERE o.id IN (v_old_order_id, v_new_order_id)
       AND o.status IN (
         'waiting_approval', 'escalated_to_board', 'confirmed', 'logistic',
         'in_production', 'in_separation', 'in_transit', 'delivered',
         'completed', 'cancelled'
       )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Pedido submetido não permite alterar valor ou itens.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.freeze_sicoob_order_while_approval_pending() FROM PUBLIC;

COMMENT ON COLUMN public.sicoob_orders.approval_policy_snapshot IS
  'Fotografia imutável da política aplicada na primeira submissão do pedido.';
COMMENT ON FUNCTION public.capture_sicoob_order_approval_policy() IS
  'Captura e protege a política efetivamente aplicada ao pedido.';
