-- Centraliza os efeitos de uma mudança de status Sicoob no modelo canônico.
-- order_audit_events pertence ao domínio legado de pedidos e não participa
-- deste fluxo: o histórico Sicoob é sicoob_order_history e a interface lê
-- workspace_notifications para avisos in-app.

CREATE OR REPLACE FUNCTION public.record_sicoob_order_status_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status_changed boolean := OLD.status IS DISTINCT FROM NEW.status;
  v_sla_became_critical boolean := NEW.sla_status = 'critical'
    AND OLD.sla_status IS DISTINCT FROM 'critical';
  v_actor_id uuid := auth.uid();
  v_comment text := NULLIF(
    left(trim(COALESCE(current_setting('app.sicoob_order_status_comment', true), '')), 1000),
    ''
  );
  v_title text;
  v_message text;
  v_type text;
  v_recipient_id uuid;
  v_order_reference text := upper(left(NEW.id::text, 8));
BEGIN
  IF NOT v_status_changed AND NOT v_sla_became_critical THEN
    RETURN NEW;
  END IF;

  IF v_status_changed THEN
    INSERT INTO public.sicoob_order_history (
      order_id,
      user_id,
      previous_status,
      new_status,
      comment
    ) VALUES (
      NEW.id,
      v_actor_id,
      OLD.status,
      NEW.status,
      v_comment
    );

    SELECT
      CASE NEW.status
        WHEN 'pending' THEN 'Novo pedido pendente'
        WHEN 'waiting_approval' THEN 'Aprovação de alçada requerida'
        WHEN 'escalated_to_board' THEN 'Pedido escalado para a Diretoria'
        WHEN 'confirmed' THEN 'Pedido confirmado'
        WHEN 'rejected' THEN 'Pedido rejeitado'
        WHEN 'logistic' THEN 'Pedido em logística'
        WHEN 'completed' THEN 'Pedido concluído'
        WHEN 'cancelled' THEN 'Pedido cancelado'
        WHEN 'draft' THEN 'Pedido devolvido para rascunho'
        ELSE 'Status do pedido atualizado'
      END,
      CASE NEW.status
        WHEN 'pending' THEN format('O pedido #%s foi enviado para análise.', v_order_reference)
        WHEN 'waiting_approval' THEN format('O pedido #%s aguarda uma aprovação de alçada.', v_order_reference)
        WHEN 'escalated_to_board' THEN format('O pedido #%s foi encaminhado para a Diretoria.', v_order_reference)
        WHEN 'confirmed' THEN format('O pedido #%s foi confirmado e seguirá para processamento.', v_order_reference)
        WHEN 'rejected' THEN format('O pedido #%s foi rejeitado. Consulte o histórico para mais detalhes.', v_order_reference)
        WHEN 'logistic' THEN format('O pedido #%s entrou na etapa de logística.', v_order_reference)
        WHEN 'completed' THEN format('O pedido #%s foi concluído.', v_order_reference)
        WHEN 'cancelled' THEN format('O pedido #%s foi cancelado.', v_order_reference)
        WHEN 'draft' THEN format('O pedido #%s voltou para rascunho.', v_order_reference)
        ELSE format('O pedido #%s mudou de status.', v_order_reference)
      END,
      CASE
        WHEN NEW.status IN ('confirmed', 'completed') THEN 'success'
        WHEN NEW.status IN ('rejected', 'cancelled') THEN 'error'
        WHEN NEW.status IN ('waiting_approval', 'escalated_to_board') THEN 'warning'
        ELSE 'info'
      END
    INTO v_title, v_message, v_type;

    -- O solicitante é avisado de toda alteração feita por outra pessoa. Para
    -- submissão e alçadas, a matriz também avisa os responsáveis do escopo.
    FOR v_recipient_id IN
      WITH recipients AS (
        SELECT NEW.created_by AS user_id

        UNION

        SELECT ur.user_id
          FROM public.user_roles ur
          LEFT JOIN public.profiles p ON p.user_id = ur.user_id
         WHERE COALESCE(p.is_active, true)
           AND p.deleted_at IS NULL
           AND (
             (
               NEW.status IN ('pending', 'waiting_approval')
               AND (
                 ur.role::text IN ('admin', 'dev', 'supervisor')
                 OR (
                   ur.role::text IN ('gestor_compras', 'comprador_singular')
                   AND p.cooperativa_id = NEW.cooperative_id
                 )
                 OR (ur.role::text = 'gerente_pa' AND p.pa_id = NEW.pa_id)
               )
             )
             OR (
               NEW.status = 'escalated_to_board'
               AND ur.role::text IN ('admin', 'dev', 'supervisor')
             )
           )
      )
      SELECT user_id
        FROM recipients
       WHERE user_id IS NOT NULL
         AND user_id IS DISTINCT FROM v_actor_id
    LOOP
      INSERT INTO public.workspace_notifications (
        user_id,
        title,
        message,
        type,
        category,
        action_url,
        metadata
      ) VALUES (
        v_recipient_id,
        v_title,
        v_message,
        v_type,
        'pedidos',
        '/sicoob/pedidos/' || NEW.id,
        jsonb_build_object(
          'source', 'sicoob_order_status',
          'order_id', NEW.id,
          'previous_status', OLD.status,
          'new_status', NEW.status,
          'actor_id', v_actor_id
        )
      );
    END LOOP;
  END IF;

  IF v_sla_became_critical
    AND NEW.created_by IS NOT NULL
    AND NEW.created_by IS DISTINCT FROM v_actor_id THEN
    INSERT INTO public.workspace_notifications (
      user_id,
      title,
      message,
      type,
      category,
      action_url,
      metadata
    ) VALUES (
      NEW.created_by,
      'Alerta: SLA crítico',
      format('O pedido #%s atingiu nível crítico de SLA.', v_order_reference),
      'error',
      'pedidos',
      '/sicoob/pedidos/' || NEW.id,
      jsonb_build_object('source', 'sicoob_order_sla', 'order_id', NEW.id, 'sla_status', NEW.sla_status)
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.record_sicoob_order_status_event() FROM PUBLIC;

DROP TRIGGER IF EXISTS tr_audit_sicoob_order_status ON public.sicoob_orders;
DROP TRIGGER IF EXISTS on_order_status_change ON public.sicoob_orders;
CREATE TRIGGER tr_record_sicoob_order_status_event
AFTER UPDATE OF status, sla_status ON public.sicoob_orders
FOR EACH ROW
EXECUTE FUNCTION public.record_sicoob_order_status_event();

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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Usuário não autenticado.';
  END IF;

  IF NULLIF(trim(COALESCE(p_expected_status, '')), '') IS NULL
    OR NULLIF(trim(COALESCE(p_new_status, '')), '') IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Status atual e novo status são obrigatórios.';
  END IF;

  PERFORM set_config('app.sicoob_order_status_comment', COALESCE(p_comment, ''), true);

  UPDATE public.sicoob_orders
     SET status = trim(p_new_status),
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

REVOKE ALL ON FUNCTION public.transition_sicoob_order_status(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_sicoob_order_status(uuid, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.request_sicoob_order_approval(
  p_order_id uuid,
  p_expected_status text,
  p_reason text,
  p_threshold numeric,
  p_is_escalated boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_target_status text := CASE WHEN p_is_escalated THEN 'escalated_to_board' ELSE 'waiting_approval' END;
  v_total numeric;
  v_request_id uuid;
  v_comment text;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Usuário não autenticado.';
  END IF;
  IF length(trim(COALESCE(p_reason, ''))) < 10 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Informe uma justificativa com ao menos 10 caracteres.';
  END IF;
  IF COALESCE(p_threshold, -1) < 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A alçada informada é inválida.';
  END IF;
  IF (NOT p_is_escalated AND trim(COALESCE(p_expected_status, '')) <> 'pending')
    OR (p_is_escalated AND trim(COALESCE(p_expected_status, '')) <> 'waiting_approval') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O status atual não permite esta solicitação de aprovação.';
  END IF;

  v_comment := format(
    'Solicitação de aprovação%s: %s',
    CASE WHEN p_is_escalated THEN ' para a Diretoria' ELSE '' END,
    trim(p_reason)
  );
  PERFORM set_config('app.sicoob_order_status_comment', v_comment, true);

  UPDATE public.sicoob_orders
     SET status = v_target_status,
         updated_at = now()
   WHERE id = p_order_id
     AND status = trim(p_expected_status)
  RETURNING total_amount INTO v_total;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'O pedido mudou ou não está disponível; atualize a página e tente novamente.';
  END IF;

  INSERT INTO public.sicoob_approval_requests (
    order_id,
    requester_id,
    request_reason,
    amount_at_request,
    threshold_at_request,
    status,
    metadata
  ) VALUES (
    p_order_id,
    v_actor_id,
    trim(p_reason),
    COALESCE(v_total, 0),
    p_threshold,
    'pending',
    jsonb_build_object('escalated', p_is_escalated, 'level', CASE WHEN p_is_escalated THEN 'board' ELSE 'manager' END)
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_sicoob_order_approval(uuid, text, text, numeric, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_sicoob_order_approval(uuid, text, text, numeric, boolean) TO authenticated;

COMMENT ON FUNCTION public.record_sicoob_order_status_event() IS
  'Registra histórico e notificações in-app do pedido Sicoob na mesma transação da mudança de status.';
COMMENT ON FUNCTION public.transition_sicoob_order_status(uuid, text, text, text) IS
  'Transição comum de status Sicoob com comparação de estado e comentário transacional.';
COMMENT ON FUNCTION public.request_sicoob_order_approval(uuid, text, text, numeric, boolean) IS
  'Cria solicitação de alçada e altera o status do pedido em uma única transação.';
