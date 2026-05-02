-- Função de gatilho para validar orçamento e alçada antes da atualização do pedido
CREATE OR REPLACE FUNCTION public.check_order_constraints_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_verba_total NUMERIC;
    v_verba_consumida NUMERIC;
    v_limite_alcada NUMERIC;
BEGIN
    -- Só validamos quando o pedido muda para um status que consome orçamento ou requer aprovação final
    IF (NEW.status IN ('confirmed', 'waiting_approval')) AND (OLD.status = 'draft' OR OLD.status = 'waiting_approval') THEN
        
        -- Buscar dados de orçamento do PA para o mês/ano atual
        SELECT verba_total, verba_consumida, limite_alcada 
        INTO v_verba_total, v_verba_consumida, v_limite_alcada
        FROM public.pa_budgets
        WHERE pa_id = NEW.pa_id
        AND ano = EXTRACT(YEAR FROM NEW.created_at)
        AND mes = EXTRACT(MONTH FROM NEW.created_at)
        LIMIT 1;

        -- 1. Validar existência de orçamento
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Orçamento não configurado para o PA % neste período.', NEW.pa_id;
        END IF;

        -- 2. Validar se o valor total do pedido cabe no orçamento restante
        IF NEW.status = 'confirmed' AND (v_verba_consumida + NEW.total_amount) > v_verba_total THEN
            RAISE EXCEPTION 'Saldo de orçamento insuficiente. Disponível: %, Solicitado: %', 
                (v_verba_total - v_verba_consumida), NEW.total_amount;
        END IF;

        -- 3. Validar alçada: se exceder o limite e tentar confirmar sem aprovação, bloqueia
        -- (Pedidos 'confirmed' vindo de 'waiting_approval' com aprovador setado são permitidos)
        IF NEW.status = 'confirmed' AND NEW.total_amount > v_limite_alcada AND NEW.approved_by IS NULL THEN
            RAISE EXCEPTION 'Este pedido excede a alçada de % e requer aprovação formal.', v_limite_alcada;
        END IF;
        
        -- 4. Atualizar verba consumida automaticamente se o pedido for confirmado agora
        IF NEW.status = 'confirmed' AND OLD.status <> 'confirmed' THEN
            UPDATE public.pa_budgets
            SET verba_consumida = verba_consumida + NEW.total_amount,
                updated_at = now()
            WHERE pa_id = NEW.pa_id
            AND ano = EXTRACT(YEAR FROM NEW.created_at)
            AND mes = EXTRACT(MONTH FROM NEW.created_at);
        END IF;

    END IF;

    RETURN NEW;
END;
$$;

-- Criar o gatilho na tabela sicoob_orders
DROP TRIGGER IF EXISTS trg_validate_sicoob_order ON public.sicoob_orders;
CREATE TRIGGER trg_validate_sicoob_order
BEFORE UPDATE ON public.sicoob_orders
FOR EACH ROW
EXECUTE FUNCTION public.check_order_constraints_trigger();
