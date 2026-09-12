-- Fecha caminhos de aprovação que ainda permitiam decisões fora do fluxo
-- formal. A política por cooperativa é versionada e o pedido preserva a
-- referência usada quando entrou em análise.

CREATE TABLE IF NOT EXISTS public.sicoob_approval_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cooperative_id uuid REFERENCES public.cooperativas(id) ON DELETE CASCADE,
  version text NOT NULL,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  forbid_self_approval boolean NOT NULL DEFAULT true,
  require_active_membership boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(trim(version)) > 0),
  CHECK (effective_until IS NULL OR effective_until > effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_sicoob_approval_policy_version
  ON public.sicoob_approval_policies (cooperative_id, version)
  NULLS NOT DISTINCT;

CREATE INDEX IF NOT EXISTS idx_sicoob_approval_policies_lookup
  ON public.sicoob_approval_policies (cooperative_id, is_active, effective_from DESC);

ALTER TABLE public.sicoob_approval_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Central administra políticas de aprovação Sicoob" ON public.sicoob_approval_policies;
CREATE POLICY "Central administra políticas de aprovação Sicoob"
ON public.sicoob_approval_policies
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
      JOIN public.profiles p ON p.user_id = ur.user_id OR p.id = ur.user_id
     WHERE ur.user_id = auth.uid()
       AND ur.role::text IN ('admin', 'dev', 'supervisor')
       AND p.is_active IS TRUE
       AND p.deleted_at IS NULL
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
      JOIN public.profiles p ON p.user_id = ur.user_id OR p.id = ur.user_id
     WHERE ur.user_id = auth.uid()
       AND ur.role::text IN ('admin', 'dev', 'supervisor')
       AND p.is_active IS TRUE
       AND p.deleted_at IS NULL
  )
);

-- Remove automações legadas antes de normalizar solicitações históricas.
DROP TRIGGER IF EXISTS on_approval_request_created ON public.sicoob_approval_requests;
DROP TRIGGER IF EXISTS on_approval_status_change ON public.sicoob_approval_requests;

WITH ranked_pending AS (
  SELECT id, row_number() OVER (PARTITION BY order_id ORDER BY created_at DESC, id DESC) AS position
  FROM public.sicoob_approval_requests
  WHERE status = 'pending'
)
UPDATE public.sicoob_approval_requests r
   SET status = 'rejected',
       rejection_reason = COALESCE(NULLIF(trim(r.rejection_reason), ''), 'Solicitação duplicada encerrada durante migração'),
       updated_at = now()
  FROM ranked_pending ranked
 WHERE ranked.id = r.id AND ranked.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS ux_sicoob_approval_one_pending_per_order
  ON public.sicoob_approval_requests(order_id) WHERE status = 'pending';

ALTER TABLE public.sicoob_orders
  ADD COLUMN IF NOT EXISTS approval_policy_id uuid REFERENCES public.sicoob_approval_policies(id),
  ADD COLUMN IF NOT EXISTS approval_policy_version text;

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
    SELECT id, cooperative_id, approval_policy_id
      FROM public.sicoob_orders
     WHERE id = p_order_id
  ), candidates AS (
    -- Uma política já gravada no pedido sempre vence: decisões em andamento
    -- não mudam de regra quando a cooperativa publica uma revisão posterior.
    SELECT p.id AS policy_id,
           p.version AS policy_version,
           p.forbid_self_approval,
           p.require_active_membership,
           2 AS priority,
           p.effective_from
      FROM public.sicoob_approval_policies p
      JOIN target t ON p.id = t.approval_policy_id

    UNION ALL

    SELECT p.id,
           p.version,
           p.forbid_self_approval,
           p.require_active_membership,
           1,
           p.effective_from
      FROM public.sicoob_approval_policies p
      JOIN target t ON t.approval_policy_id IS NULL
     WHERE p.is_active
       AND p.effective_from <= now()
       AND (p.effective_until IS NULL OR p.effective_until > now())
       AND (p.cooperative_id = t.cooperative_id OR p.cooperative_id IS NULL)

    UNION ALL

    -- Base técnica conservadora. Não representa uma política institucional;
    -- ela impede autoaprovação e vínculo inativo até a cooperativa cadastrar
    -- uma versão formal própria.
    SELECT NULL::uuid,
           'baseline-tecnica-v1'::text,
           true,
           true,
           0,
           NULL::timestamptz
  )
  SELECT policy_id, policy_version, forbid_self_approval, require_active_membership
    FROM candidates
   ORDER BY priority DESC, effective_from DESC NULLS LAST, policy_id
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_sicoob_order_approval_policy(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.sicoob_actor_can_approve(
  p_actor_id uuid,
  p_order_id uuid,
  p_board_only boolean DEFAULT false
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.sicoob_orders o
      CROSS JOIN LATERAL public.get_sicoob_order_approval_policy(o.id) policy
     WHERE o.id = p_order_id
       AND (
         NOT policy.forbid_self_approval
         OR o.created_by IS DISTINCT FROM p_actor_id
       )
       AND EXISTS (
         SELECT 1
           FROM public.profiles p
          WHERE (p.user_id = p_actor_id OR p.id = p_actor_id)
            AND (
              NOT policy.require_active_membership
              OR (p.is_active IS TRUE AND p.deleted_at IS NULL)
            )
            AND (
              EXISTS (
                SELECT 1 FROM public.user_roles ur
                 WHERE ur.user_id = p_actor_id
                   AND ur.role::text IN ('admin', 'dev', 'supervisor')
              )
              OR (
                NOT p_board_only
                AND EXISTS (
                  SELECT 1 FROM public.user_roles ur
                   WHERE ur.user_id = p_actor_id
                     AND ur.role::text IN ('gestor_compras', 'comprador_singular')
                )
                AND p.cooperativa_id = o.cooperative_id
              )
              OR (
                NOT p_board_only
                AND EXISTS (
                  SELECT 1 FROM public.user_roles ur
                   WHERE ur.user_id = p_actor_id
                     AND ur.role::text = 'gerente_pa'
                )
                AND p.pa_id = o.pa_id
              )
            )
       )
  );
$$;

REVOKE ALL ON FUNCTION public.sicoob_actor_can_approve(uuid, uuid, boolean) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.sicoob_actor_can_request_approval(
  p_actor_id uuid,
  p_order_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sicoob_orders o
    JOIN public.profiles p ON p.user_id = p_actor_id OR p.id = p_actor_id
    WHERE o.id = p_order_id
      AND p.is_active IS TRUE
      AND p.deleted_at IS NULL
      AND (
        o.created_by = p_actor_id
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = p_actor_id AND ur.role::text IN ('admin', 'dev', 'supervisor')
        )
        OR (
          p.cooperativa_id = o.cooperative_id
          AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = p_actor_id AND ur.role::text IN ('gestor_compras', 'comprador_singular')
          )
        )
        OR (
          p.pa_id = o.pa_id
          AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = p_actor_id AND ur.role::text IN ('gerente_pa', 'comprador_pac')
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.sicoob_actor_can_request_approval(uuid, uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.assert_sicoob_approval_actor(
  p_actor_id uuid,
  p_order_id uuid,
  p_requester_id uuid DEFAULT NULL,
  p_board_only boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.sicoob_orders%ROWTYPE;
  v_policy record;
BEGIN
  SELECT * INTO v_order
    FROM public.sicoob_orders
   WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Pedido não encontrado.';
  END IF;

  SELECT * INTO v_policy
    FROM public.get_sicoob_order_approval_policy(p_order_id);

  IF v_policy.require_active_membership
     AND NOT EXISTS (
       SELECT 1
         FROM public.profiles p
        WHERE (p.user_id = p_actor_id OR p.id = p_actor_id)
          AND p.is_active IS TRUE
          AND p.deleted_at IS NULL
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'A decisão exige vínculo ativo com a cooperativa.';
  END IF;

  IF v_policy.forbid_self_approval
     AND (v_order.created_by = p_actor_id OR p_requester_id = p_actor_id) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'A política vigente não permite decidir o próprio pedido.';
  END IF;

  IF NOT public.sicoob_actor_can_approve(p_actor_id, p_order_id, p_board_only) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Aprovador fora da alçada ou do escopo do pedido.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_sicoob_approval_actor(uuid, uuid, uuid, boolean) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.guard_sicoob_approval_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_operation text := current_setting('app.sicoob_approval_operation', true);
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF (OLD.status, NEW.status) = ('pending', 'waiting_approval')
     AND v_operation IS DISTINCT FROM 'prepare' AND v_operation IS DISTINCT FROM 'request' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'A entrada em aprovação exige preparação ou solicitação formal.';
  END IF;

  IF (OLD.status, NEW.status) = ('waiting_approval', 'escalated_to_board')
     AND v_operation IS DISTINCT FROM 'escalate' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'A escalação exige solicitação formal para a Diretoria.';
  END IF;

  IF NEW.status = 'confirmed'
     AND v_operation IS DISTINCT FROM 'confirm' AND v_operation IS DISTINCT FROM 'approve' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'A confirmação exige uma decisão formal de alçada.';
  END IF;

  IF NEW.status = 'rejected'
     AND v_operation IS DISTINCT FROM 'reject' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'A rejeição exige motivo e decisão formal.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_sicoob_approval_status_transition() FROM PUBLIC;

-- O gatilho histórico reescrevia `pending` depois das guardas formais e podia
-- inserir o pedido no fluxo protegido sem solicitação nem snapshot.
DROP TRIGGER IF EXISTS trigger_sicoob_order_flow_intelligence ON public.sicoob_orders;

DROP TRIGGER IF EXISTS tr_guard_sicoob_approval_status_transition ON public.sicoob_orders;
CREATE TRIGGER tr_guard_sicoob_approval_status_transition
BEFORE UPDATE OF status ON public.sicoob_orders
FOR EACH ROW
EXECUTE FUNCTION public.guard_sicoob_approval_status_transition();

CREATE OR REPLACE FUNCTION public.protect_sicoob_approval_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_operation text := current_setting('app.sicoob_approval_operation', true);
BEGIN
  IF NEW.order_id IS DISTINCT FROM OLD.order_id
     OR NEW.requester_id IS DISTINCT FROM OLD.requester_id
     OR NEW.request_reason IS DISTINCT FROM OLD.request_reason
     OR NEW.amount_at_request IS DISTINCT FROM OLD.amount_at_request
     OR NEW.threshold_at_request IS DISTINCT FROM OLD.threshold_at_request THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Os dados submetidos para aprovação são imutáveis.';
  END IF;

  IF NEW.metadata IS DISTINCT FROM OLD.metadata AND v_operation IS DISTINCT FROM 'escalate' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Os metadados da solicitação não podem ser alterados fora da escalação formal.';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'pending'
       OR (NEW.status = 'approved' AND v_operation IS DISTINCT FROM 'approve')
       OR (NEW.status = 'rejected' AND v_operation IS DISTINCT FROM 'reject') THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O resultado da aprovação exige RPC de decisão formal.';
    END IF;
  END IF;

  IF NEW.approver_id IS DISTINCT FROM OLD.approver_id
     AND v_operation IS DISTINCT FROM 'approve'
     AND v_operation IS DISTINCT FROM 'reject' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O aprovador só pode ser definido na decisão formal.';
  END IF;

  IF NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
     AND v_operation IS DISTINCT FROM 'reject' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O motivo de rejeição só pode ser definido na decisão formal.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_sicoob_approval_request() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.guard_sicoob_approval_request_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.sicoob_approval_operation', true) IS DISTINCT FROM 'request' THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'A solicitação de aprovação exige a RPC formal.';
  END IF;

  IF auth.uid() IS NULL OR NEW.requester_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'O solicitante informado não corresponde à identidade autenticada.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_sicoob_approval_request_insert() FROM PUBLIC;

DROP TRIGGER IF EXISTS tr_guard_sicoob_approval_request_insert ON public.sicoob_approval_requests;
CREATE TRIGGER tr_guard_sicoob_approval_request_insert
BEFORE INSERT ON public.sicoob_approval_requests
FOR EACH ROW
EXECUTE FUNCTION public.guard_sicoob_approval_request_insert();

DROP TRIGGER IF EXISTS tr_protect_sicoob_approval_request ON public.sicoob_approval_requests;
CREATE TRIGGER tr_protect_sicoob_approval_request
BEFORE UPDATE ON public.sicoob_approval_requests
FOR EACH ROW
EXECUTE FUNCTION public.protect_sicoob_approval_request();

CREATE OR REPLACE FUNCTION public.freeze_sicoob_order_while_approval_pending()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid := CASE
    WHEN TG_TABLE_NAME = 'sicoob_orders' THEN (to_jsonb(OLD) ->> 'id')::uuid
    ELSE COALESCE(to_jsonb(NEW) ->> 'order_id', to_jsonb(OLD) ->> 'order_id')::uuid
  END;
BEGIN
  IF EXISTS (
    SELECT 1
      FROM public.sicoob_orders o
     WHERE o.id = v_order_id
       AND o.status IN ('waiting_approval', 'escalated_to_board')
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Pedido preparado ou com aprovação pendente não permite alterar valor ou itens.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.freeze_sicoob_order_while_approval_pending() FROM PUBLIC;

DROP TRIGGER IF EXISTS tr_freeze_sicoob_order_total_pending_approval ON public.sicoob_orders;
CREATE TRIGGER tr_freeze_sicoob_order_total_pending_approval
BEFORE UPDATE OF total_amount ON public.sicoob_orders
FOR EACH ROW
EXECUTE FUNCTION public.freeze_sicoob_order_while_approval_pending();

DROP TRIGGER IF EXISTS tr_freeze_sicoob_order_items_pending_approval ON public.sicoob_order_items;
CREATE TRIGGER tr_freeze_sicoob_order_items_pending_approval
BEFORE INSERT OR UPDATE OR DELETE ON public.sicoob_order_items
FOR EACH ROW
EXECUTE FUNCTION public.freeze_sicoob_order_while_approval_pending();

-- O gatilho histórico de solicitações duplica o aviso da transição canônica
-- do pedido e pode divergir dela. O histórico e as notificações passam a ter
-- uma única origem em record_sicoob_order_status_event.
DROP TRIGGER IF EXISTS on_approval_request_created ON public.sicoob_approval_requests;
DROP FUNCTION IF EXISTS public.notify_approval_request();
DROP TRIGGER IF EXISTS on_approval_status_change ON public.sicoob_approval_requests;

CREATE OR REPLACE FUNCTION public.transition_sicoob_order_status(
  p_order_id uuid,
  p_expected_status text,
  p_new_status text,
  p_comment text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_new_status text := trim(COALESCE(p_new_status, ''));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Usuário não autenticado.';
  END IF;

  IF NULLIF(trim(COALESCE(p_expected_status, '')), '') IS NULL OR v_new_status = '' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Status atual e novo status são obrigatórios.';
  END IF;

  IF v_new_status IN ('waiting_approval', 'escalated_to_board', 'confirmed', 'rejected') THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Use a RPC específica para preparar, solicitar, decidir ou escalar uma aprovação.';
  END IF;

  IF v_new_status = 'cancelled' THEN
    PERFORM set_config('app.sicoob_approval_operation', 'reject', true);
    UPDATE public.sicoob_approval_requests
       SET status = 'rejected',
           approver_id = auth.uid(),
           rejection_reason = 'Pedido cancelado: ' || COALESCE(NULLIF(trim(p_comment), ''), 'sem observação adicional'),
           updated_at = now()
     WHERE order_id = p_order_id AND status = 'pending';
  END IF;

  PERFORM set_config('app.sicoob_order_status_comment', COALESCE(p_comment, ''), true);

  UPDATE public.sicoob_orders
     SET status = v_new_status,
         updated_at = now()
   WHERE id = p_order_id
     AND status = trim(p_expected_status)
  RETURNING id INTO v_order_id;

  IF v_order_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'O pedido mudou ou não está disponível; atualize a página e tente novamente.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.prepare_sicoob_order_confirmation(
  p_order_id uuid,
  p_expected_status text,
  p_comment text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_order public.sicoob_orders%ROWTYPE;
  v_limit numeric;
  v_policy record;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Usuário não autenticado.';
  END IF;

  SELECT * INTO v_order
    FROM public.sicoob_orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF NOT FOUND OR v_order.status IS DISTINCT FROM p_expected_status OR v_order.status <> 'pending' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'O pedido mudou ou não está disponível para preparação.';
  END IF;
  IF NOT public.sicoob_actor_can_request_approval(v_actor_id, v_order.id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Usuário fora do escopo do pedido.';
  END IF;

  SELECT limite_alcada INTO v_limit
    FROM public.pa_budgets
   WHERE pa_id = v_order.pa_id
     AND ano = EXTRACT(YEAR FROM v_order.created_at)::integer
     AND mes = EXTRACT(MONTH FROM v_order.created_at)::integer;

  IF v_limit IS NULL OR COALESCE(v_order.total_amount, 0) > v_limit THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O pedido requer solicitação formal de aprovação.';
  END IF;

  SELECT * INTO v_policy FROM public.get_sicoob_order_approval_policy(v_order.id);
  PERFORM set_config('app.sicoob_approval_operation', 'prepare', true);
  PERFORM set_config('app.sicoob_order_status_comment', COALESCE(p_comment, 'Preparado para confirmação dentro da alçada.'), true);

  UPDATE public.sicoob_orders
     SET status = 'waiting_approval',
         approval_policy_id = COALESCE(v_order.approval_policy_id, v_policy.policy_id),
         approval_policy_version = COALESCE(v_order.approval_policy_version, v_policy.policy_version),
         updated_at = now()
   WHERE id = v_order.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_sicoob_order_approval(
  p_order_id uuid,
  p_expected_status text,
  p_reason text,
  p_threshold numeric,
  p_is_escalated boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_order public.sicoob_orders%ROWTYPE;
  v_target_status text := CASE WHEN p_is_escalated THEN 'escalated_to_board' ELSE 'waiting_approval' END;
  v_threshold numeric;
  v_request_id uuid;
  v_comment text;
  v_policy record;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Usuário não autenticado.';
  END IF;
  IF length(trim(COALESCE(p_reason, ''))) < 10 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Informe uma justificativa com ao menos 10 caracteres.';
  END IF;
  IF (NOT p_is_escalated AND trim(COALESCE(p_expected_status, '')) <> 'pending')
    OR (p_is_escalated AND trim(COALESCE(p_expected_status, '')) <> 'waiting_approval') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O status atual não permite esta solicitação de aprovação.';
  END IF;

  SELECT * INTO v_order
    FROM public.sicoob_orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF NOT FOUND OR v_order.status IS DISTINCT FROM trim(p_expected_status) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'O pedido mudou ou não está disponível; atualize a página e tente novamente.';
  END IF;
  IF NOT public.sicoob_actor_can_request_approval(v_actor_id, v_order.id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Usuário fora do escopo do pedido.';
  END IF;

  SELECT limite_alcada INTO v_threshold
    FROM public.pa_budgets
   WHERE pa_id = v_order.pa_id
     AND ano = EXTRACT(YEAR FROM v_order.created_at)::integer
     AND mes = EXTRACT(MONTH FROM v_order.created_at)::integer;

  IF v_threshold IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'A alçada do PA não está configurada para o período do pedido.';
  END IF;

  SELECT * INTO v_policy FROM public.get_sicoob_order_approval_policy(v_order.id);
  v_comment := format(
    'Solicitação de aprovação%s: %s',
    CASE WHEN p_is_escalated THEN ' para a Diretoria' ELSE '' END,
    trim(p_reason)
  );
  PERFORM set_config('app.sicoob_approval_operation', CASE WHEN p_is_escalated THEN 'escalate' ELSE 'request' END, true);
  PERFORM set_config('app.sicoob_order_status_comment', v_comment, true);

  IF p_is_escalated THEN
    SELECT id INTO v_request_id
      FROM public.sicoob_approval_requests
     WHERE order_id = v_order.id AND status = 'pending'
     FOR UPDATE;

    IF v_request_id IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'A escalação exige uma solicitação de aprovação pendente.';
    END IF;

    UPDATE public.sicoob_approval_requests
       SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
             'escalated', true,
             'level', 'board',
             'escalation_reason', trim(p_reason),
             'approval_policy_version', v_policy.policy_version
           ),
           updated_at = now()
     WHERE id = v_request_id;
  ELSIF EXISTS (
    SELECT 1 FROM public.sicoob_approval_requests
     WHERE order_id = v_order.id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O pedido já possui uma solicitação de aprovação pendente.';
  ELSE
    INSERT INTO public.sicoob_approval_requests (
      order_id,
      requester_id,
      request_reason,
      amount_at_request,
      threshold_at_request,
      status,
      metadata
    ) VALUES (
      v_order.id,
      v_actor_id,
      trim(p_reason),
      COALESCE(v_order.total_amount, 0),
      v_threshold,
      'pending',
      jsonb_build_object(
        'escalated', false,
        'level', 'manager',
        'approval_policy_version', v_policy.policy_version
      )
    )
    RETURNING id INTO v_request_id;
  END IF;

  UPDATE public.sicoob_orders
     SET status = v_target_status,
         approval_policy_id = COALESCE(v_order.approval_policy_id, v_policy.policy_id),
         approval_policy_version = COALESCE(v_order.approval_policy_version, v_policy.policy_version),
         updated_at = now()
   WHERE id = v_order.id;

  RETURN v_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_sicoob_order(
  p_order_id uuid,
  p_expected_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_order public.sicoob_orders%ROWTYPE;
  v_limit numeric;
  v_policy record;
  v_initial_status text;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Autenticação necessária.';
  END IF;

  SELECT * INTO v_order FROM public.sicoob_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Pedido não encontrado.';
  END IF;
  IF v_order.status IS DISTINCT FROM p_expected_status
     OR v_order.status NOT IN ('pending', 'waiting_approval') THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'O pedido mudou; atualize a página antes de confirmar.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.sicoob_approval_requests WHERE order_id = v_order.id AND status = 'pending') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O pedido possui solicitação de aprovação pendente.';
  END IF;

  PERFORM public.assert_sicoob_approval_actor(v_actor_id, v_order.id, NULL, false);

  SELECT limite_alcada INTO v_limit
    FROM public.pa_budgets
   WHERE pa_id = v_order.pa_id
     AND ano = EXTRACT(YEAR FROM v_order.created_at)::integer
     AND mes = EXTRACT(MONTH FROM v_order.created_at)::integer;
  IF v_limit IS NULL OR v_order.total_amount > v_limit THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O pedido requer solicitação formal de aprovação.';
  END IF;

  SELECT * INTO v_policy FROM public.get_sicoob_order_approval_policy(v_order.id);
  v_initial_status := v_order.status;

  -- Uma confirmação iniciada em pending preserva as duas etapas formais no
  -- histórico, mas as executa em uma única transação e sob o mesmo bloqueio.
  IF v_order.status = 'pending' THEN
    PERFORM set_config('app.sicoob_approval_operation', 'prepare', true);
    PERFORM set_config('app.sicoob_order_status_comment', 'Preparado para confirmação dentro da alçada.', true);
    UPDATE public.sicoob_orders
       SET status = 'waiting_approval',
           approval_policy_id = COALESCE(v_order.approval_policy_id, v_policy.policy_id),
           approval_policy_version = COALESCE(v_order.approval_policy_version, v_policy.policy_version),
           updated_at = now()
     WHERE id = v_order.id;
  END IF;

  PERFORM set_config('app.sicoob_approval_operation', 'confirm', true);
  PERFORM set_config('app.sicoob_order_status_comment', 'Confirmado dentro da alçada.', true);
  UPDATE public.sicoob_orders
     SET status = 'confirmed',
         approved_by = v_actor_id,
         approved_at = now(),
         approval_policy_id = COALESCE(v_order.approval_policy_id, v_policy.policy_id),
         approval_policy_version = COALESCE(v_order.approval_policy_version, v_policy.policy_version),
         updated_at = now()
   WHERE id = v_order.id;

  INSERT INTO public.sicoob_manager_audit (manager_id, order_id, action, details)
  VALUES (v_actor_id, v_order.id, 'confirm_within_limit', jsonb_build_object('previous_status', v_initial_status, 'policy_version', v_policy.policy_version));
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_sicoob_order(
  p_request_id uuid,
  p_order_id uuid,
  p_manager_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_request public.sicoob_approval_requests%ROWTYPE;
  v_order public.sicoob_orders%ROWTYPE;
BEGIN
  IF v_actor_id IS NULL OR p_manager_id IS DISTINCT FROM v_actor_id THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Identidade do aprovador inválida.';
  END IF;

  SELECT * INTO v_order FROM public.sicoob_orders WHERE id = p_order_id FOR UPDATE;
  SELECT * INTO v_request FROM public.sicoob_approval_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR v_order.id IS NULL OR v_request.order_id <> v_order.id THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Solicitação ou pedido não encontrado.';
  END IF;
  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Solicitação já decidida.';
  END IF;
  IF v_order.status NOT IN ('waiting_approval', 'escalated_to_board') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Pedido não está aguardando aprovação.';
  END IF;
  IF v_order.total_amount IS DISTINCT FROM v_request.amount_at_request THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O valor do pedido diverge da solicitação submetida; reenvie para aprovação.';
  END IF;

  PERFORM public.assert_sicoob_approval_actor(v_actor_id, v_order.id, v_request.requester_id, v_order.status = 'escalated_to_board');
  PERFORM set_config('app.sicoob_approval_operation', 'approve', true);

  UPDATE public.sicoob_approval_requests
     SET status = 'approved', approver_id = v_actor_id, updated_at = now()
   WHERE id = v_request.id;
  UPDATE public.sicoob_orders
     SET status = 'confirmed', approved_by = v_actor_id, approved_at = now(), updated_at = now()
   WHERE id = v_order.id;

  INSERT INTO public.sicoob_manager_audit (manager_id, order_id, action, details)
  VALUES (v_actor_id, v_order.id, 'approve', jsonb_build_object('request_id', v_request.id, 'policy_version', v_order.approval_policy_version));
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_sicoob_order(
  p_request_id uuid,
  p_order_id uuid,
  p_manager_id uuid,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_request public.sicoob_approval_requests%ROWTYPE;
  v_order public.sicoob_orders%ROWTYPE;
BEGIN
  IF v_actor_id IS NULL OR p_manager_id IS DISTINCT FROM v_actor_id THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Identidade do aprovador inválida.';
  END IF;
  IF length(trim(COALESCE(p_reason, ''))) < 10 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Informe um motivo de rejeição com ao menos 10 caracteres.';
  END IF;

  SELECT * INTO v_order FROM public.sicoob_orders WHERE id = p_order_id FOR UPDATE;
  SELECT * INTO v_request FROM public.sicoob_approval_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR v_order.id IS NULL OR v_request.order_id <> v_order.id THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Solicitação ou pedido não encontrado.';
  END IF;
  IF v_request.status <> 'pending' OR v_order.status NOT IN ('waiting_approval', 'escalated_to_board') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Solicitação ou pedido não está disponível para rejeição.';
  END IF;

  PERFORM public.assert_sicoob_approval_actor(v_actor_id, v_order.id, v_request.requester_id, v_order.status = 'escalated_to_board');
  PERFORM set_config('app.sicoob_approval_operation', 'reject', true);
  PERFORM set_config('app.sicoob_order_status_comment', trim(p_reason), true);

  UPDATE public.sicoob_approval_requests
     SET status = 'rejected', approver_id = v_actor_id, rejection_reason = trim(p_reason), updated_at = now()
   WHERE id = v_request.id;
  UPDATE public.sicoob_orders
     SET status = 'rejected', updated_at = now()
   WHERE id = v_order.id;

  INSERT INTO public.sicoob_manager_audit (manager_id, order_id, action, details)
  VALUES (v_actor_id, v_order.id, 'reject', jsonb_build_object('request_id', v_request.id, 'reason', trim(p_reason), 'policy_version', v_order.approval_policy_version));
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_sicoob_order_without_approval(
  p_order_id uuid,
  p_expected_status text,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_order public.sicoob_orders%ROWTYPE;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Autenticação necessária.';
  END IF;
  IF length(trim(COALESCE(p_reason, ''))) < 10 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Informe um motivo de rejeição com ao menos 10 caracteres.';
  END IF;

  SELECT * INTO v_order FROM public.sicoob_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.status IS DISTINCT FROM p_expected_status OR v_order.status <> 'waiting_approval' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'O pedido mudou ou não está disponível para rejeição.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.sicoob_approval_requests WHERE order_id = v_order.id AND status = 'pending') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Use a rejeição vinculada à solicitação de aprovação pendente.';
  END IF;

  PERFORM public.assert_sicoob_approval_actor(v_actor_id, v_order.id, NULL, false);
  PERFORM set_config('app.sicoob_approval_operation', 'reject', true);
  PERFORM set_config('app.sicoob_order_status_comment', trim(p_reason), true);

  UPDATE public.sicoob_orders
     SET status = 'rejected', updated_at = now()
   WHERE id = v_order.id;

  INSERT INTO public.sicoob_manager_audit (manager_id, order_id, action, details)
  VALUES (v_actor_id, v_order.id, 'reject_without_formal_request', jsonb_build_object('reason', trim(p_reason), 'policy_version', v_order.approval_policy_version));
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_sicoob_order_confirmation(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_sicoob_order_without_approval(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prepare_sicoob_order_confirmation(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_sicoob_order_without_approval(uuid, text, text) TO authenticated;

COMMENT ON TABLE public.sicoob_approval_policies IS
  'Políticas versionadas por cooperativa. A ausência de política formal usa somente a base técnica conservadora.';
COMMENT ON FUNCTION public.get_sicoob_order_approval_policy(uuid) IS
  'Resolve a política preservada no pedido ou a versão vigente da cooperativa, com base técnica conservadora como último recurso.';
COMMENT ON FUNCTION public.freeze_sicoob_order_while_approval_pending() IS
  'Impede mudança de valor ou itens enquanto a solicitação formal estiver pendente.';
