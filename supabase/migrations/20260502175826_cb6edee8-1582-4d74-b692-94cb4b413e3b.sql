-- Função para validar transição de status de pedidos
CREATE OR REPLACE FUNCTION public.validate_order_status_transition()
RETURNS TRIGGER AS $$
DECLARE
    valid_transitions JSONB;
    current_status TEXT;
    new_status TEXT;
BEGIN
    current_status := OLD.status;
    new_status := NEW.status;

    -- Se o status não mudou, permite a atualização
    IF current_status = new_status THEN
        RETURN NEW;
    END IF;

    -- Mapa de transições válidas
    valid_transitions := '{
        "draft": ["pending", "cancelled"],
        "pending": ["waiting_approval", "cancelled"],
        "waiting_approval": ["confirmed", "rejected", "cancelled"],
        "confirmed": ["in_production", "cancelled"],
        "in_production": ["in_separation", "cancelled"],
        "in_separation": ["in_transit", "cancelled"],
        "in_transit": ["delivered", "cancelled"],
        "delivered": ["completed", "cancelled"],
        "completed": [],
        "rejected": ["draft", "pending"],
        "cancelled": []
    }'::JSONB;

    -- Verifica se a transição existe no mapa e se o novo status é permitido
    IF NOT (valid_transitions ? current_status AND new_status = ANY(ARRAY(SELECT jsonb_array_elements_text(valid_transitions -> current_status)))) THEN
        RAISE EXCEPTION 'Transição de status inválida: de % para %', current_status, new_status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar status em sicoob_orders
DROP TRIGGER IF EXISTS tr_validate_sicoob_order_status ON public.sicoob_orders;
CREATE TRIGGER tr_validate_sicoob_order_status
BEFORE UPDATE OF status ON public.sicoob_orders
FOR EACH ROW
EXECUTE FUNCTION public.validate_order_status_transition();

-- Trigger para validar status em orders (tabela principal)
-- Note: A tabela orders usa labels ligeiramente diferentes em alguns lugares, 
-- mas o workflow solicitado usa: em_producao, em_separacao, em_transporte, entregue, concluido
-- Vamos adaptar para os valores internos da tabela orders se necessário.
-- No useOrders.ts vimos: in_production, in_separation, in_transit, delivered, completed.

CREATE OR REPLACE FUNCTION public.validate_main_order_status_transition()
RETURNS TRIGGER AS $$
DECLARE
    valid_transitions JSONB;
    current_status TEXT;
    new_status TEXT;
BEGIN
    current_status := OLD.status;
    new_status := NEW.status;

    IF current_status = new_status THEN
        RETURN NEW;
    END IF;

    valid_transitions := '{
        "pending": ["waiting_approval", "cancelled"],
        "waiting_approval": ["confirmed", "cancelled"],
        "confirmed": ["in_production", "cancelled"],
        "in_production": ["in_separation", "cancelled"],
        "in_separation": ["in_transit", "cancelled"],
        "in_transit": ["delivered", "cancelled"],
        "delivered": ["completed", "cancelled"],
        "completed": [],
        "cancelled": []
    }'::JSONB;

    IF NOT (valid_transitions ? current_status AND new_status = ANY(ARRAY(SELECT jsonb_array_elements_text(valid_transitions -> current_status)))) THEN
        RAISE EXCEPTION 'Transição de status inválida no workflow: de % para %', current_status, new_status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_validate_main_order_status ON public.orders;
CREATE TRIGGER tr_validate_main_order_status
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.validate_main_order_status_transition();
