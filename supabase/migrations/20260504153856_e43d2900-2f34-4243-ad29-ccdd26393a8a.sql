-- Adicionar configuração de limite de alçada por cooperativa
ALTER TABLE public.cooperativas ADD COLUMN IF NOT EXISTS alcada_superior_threshold DECIMAL(12,2) DEFAULT 50000.00;

-- Função para determinar o status inicial/próximo de um pedido Sicoob baseado em verba e alçada
CREATE OR REPLACE FUNCTION public.determine_sicoob_order_flow_status()
RETURNS TRIGGER AS $$
DECLARE
    v_coop_threshold DECIMAL(12,2);
    v_pa_budget_available DECIMAL(12,2);
BEGIN
    -- Se o status for alterado para 'pending', avaliar o próximo passo
    IF NEW.status = 'pending' THEN
        -- Buscar limite da cooperativa
        SELECT alcada_superior_threshold INTO v_coop_threshold 
        FROM public.cooperativas 
        WHERE id = NEW.cooperative_id;

        -- Se o valor exceder o threshold da cooperativa, vai para a diretoria
        IF NEW.total_amount > v_coop_threshold THEN
            NEW.status := 'escalated_to_board';
        ELSE
            NEW.status := 'waiting_approval';
        END IF;
    END IF;

    -- Atualizar SLA inicial (48h úteis como padrão para análise)
    IF NEW.status IN ('waiting_approval', 'escalated_to_board') AND (OLD.status IS NULL OR OLD.status != NEW.status) THEN
        NEW.sla_deadline := now() + interval '48 hours';
        NEW.sla_status := 'normal';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para automatizar a inteligência de fluxo
DROP TRIGGER IF EXISTS trigger_sicoob_order_flow_intelligence ON public.sicoob_orders;
CREATE TRIGGER trigger_sicoob_order_flow_intelligence
BEFORE INSERT OR UPDATE OF status ON public.sicoob_orders
FOR EACH ROW
EXECUTE FUNCTION public.determine_sicoob_order_flow_status();
