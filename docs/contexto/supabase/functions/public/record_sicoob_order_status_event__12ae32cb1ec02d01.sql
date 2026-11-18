CREATE OR REPLACE FUNCTION public.record_sicoob_order_status_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

    FOR v_recipient_id IN
      WITH recipients AS (
        SELECT NEW.created_by AS user_id
          FROM public.profiles requester
         WHERE requester.user_id = NEW.created_by
           AND requester.is_active IS TRUE
           AND requester.deleted_at IS NULL

        UNION

        SELECT ur.user_id
          FROM public.user_roles ur
          JOIN public.profiles p ON p.user_id = ur.user_id
         WHERE p.is_active IS TRUE
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
    AND NEW.created_by IS DISTINCT FROM v_actor_id
    AND EXISTS (
      SELECT 1
        FROM public.profiles requester
       WHERE requester.user_id = NEW.created_by
         AND requester.is_active IS TRUE
         AND requester.deleted_at IS NULL
    ) THEN
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
$function$
