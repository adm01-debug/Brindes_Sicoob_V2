-- Função para gerar notificações de pedidos Sicoob
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id UUID;
    v_title TEXT;
    v_message TEXT;
    v_action_url TEXT;
    v_type TEXT := 'info';
    v_coop_nome TEXT;
    v_pa_nome TEXT;
BEGIN
    -- Busca nomes para mensagens mais ricas
    SELECT nome INTO v_coop_nome FROM public.cooperativas WHERE id = NEW.cooperative_id;
    SELECT nome INTO v_pa_nome FROM public.postos_atendimento WHERE id = NEW.pa_id;

    -- Lógica de Notificação por Status BPMN
    IF NEW.status = 'pending' THEN
        -- Notifica Supervisor/Gestor sobre novo pedido
        v_title := 'Novo Pedido Pendente';
        v_message := format('O %s (%s) enviou o pedido #%s para análise.', v_pa_nome, v_coop_nome, NEW.order_number);
        v_action_url := '/sicoob/pedidos/' || NEW.id;
        v_type := 'info';
    ELSIF NEW.status = 'waiting_approval' THEN
        -- Notifica Gestores sobre pedido aguardando aprovação de alçada
        v_title := 'Aprovação de Alçada Requerida';
        v_message := format('Pedido #%s (%s) aguarda aprovação de alçada (R$ %s).', NEW.order_number, v_pa_nome, NEW.total_amount);
        v_action_url := '/sicoob/pedidos/' || NEW.id;
        v_type := 'warning';
    ELSIF NEW.status = 'escalated_to_board' THEN
        -- Notifica Diretoria
        v_title := 'Escalação para Diretoria';
        v_message := format('Pedido #%s escalado para Alçada Superior (Board).', NEW.order_number);
        v_action_url := '/sicoob/pedidos/' || NEW.id;
        v_type := 'warning';
    ELSIF NEW.status = 'confirmed' THEN
        -- Notifica Criador que o pedido foi confirmado
        v_title := 'Pedido Confirmado';
        v_message := format('Seu pedido #%s foi aprovado e seguiu para processamento.', NEW.order_number);
        v_action_url := '/sicoob/pedidos/' || NEW.id;
        v_type := 'success';
    ELSIF NEW.status = 'rejected' THEN
        -- Notifica Criador sobre rejeição
        v_title := 'Pedido Rejeitado';
        v_message := format('O pedido #%s foi rejeitado. Verifique as observações.', NEW.order_number);
        v_action_url := '/sicoob/pedidos/' || NEW.id;
        v_type := 'error';
    END IF;

    -- Inserção na tabela de notificações (Workspace Notifications)
    -- Para simplificar, notificamos o criador em mudanças de status final e gestores em mudanças de entrada
    -- Em um cenário real, buscaríamos os user_ids dos gestores da cooperativa
    
    -- Notifica o criador (quem criou o pedido)
    IF NEW.status IN ('confirmed', 'rejected', 'logistic', 'completed') THEN
        INSERT INTO public.workspace_notifications (
            user_id, title, message, type, category, action_url, metadata
        ) VALUES (
            NEW.created_by, v_title, v_message, v_type, 'pedidos', v_action_url, 
            jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
        );
    END IF;

    -- Alerta de SLA Crítico
    IF NEW.sla_status = 'critical' AND (OLD.sla_status IS NULL OR OLD.sla_status != 'critical') THEN
        INSERT INTO public.workspace_notifications (
            user_id, title, message, type, category, action_url, metadata
        ) VALUES (
            NEW.created_by, 'ALERTA: SLA Crítico', 
            format('O pedido #%s atingiu nível crítico de SLA.', NEW.order_number), 
            'error', 'pedidos', v_action_url,
            jsonb_build_object('order_id', NEW.id, 'sla', 'critical')
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para mudanças de status
DROP TRIGGER IF EXISTS on_order_status_change ON public.sicoob_orders;
CREATE TRIGGER on_order_status_change
    AFTER UPDATE OF status, sla_status ON public.sicoob_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_order_status_change();
