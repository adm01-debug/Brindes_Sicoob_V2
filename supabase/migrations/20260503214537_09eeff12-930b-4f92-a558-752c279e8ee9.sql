-- Adicionar coluna de auditoria de saldo no pedido
ALTER TABLE public.sicoob_orders 
ADD COLUMN IF NOT EXISTS audit_remaining_budget DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS is_pilot_order BOOLEAN DEFAULT false;

-- Função para validar saldo e alçada antes de confirmar/prosseguir
CREATE OR REPLACE FUNCTION public.validate_sicoob_order_budget()
RETURNS TRIGGER AS $$
DECLARE
    current_pa_budget RECORD;
    current_pa_id UUID;
BEGIN
    -- Obter o PA_ID do pedido
    SELECT pa_id INTO current_pa_id FROM public.sicoob_orders WHERE id = NEW.id;
    
    -- Se for mudança para status que consome verba (confirmado ou em logística)
    IF (NEW.status IN ('confirmed', 'logistic') AND (OLD.status IS NULL OR OLD.status NOT IN ('confirmed', 'logistic'))) THEN
        
        -- Buscar orçamento atual do PA (considerando mês/ano atual)
        SELECT * INTO current_pa_budget 
        FROM public.pa_budgets 
        WHERE pa_id = current_pa_id 
          AND ano = EXTRACT(YEAR FROM now()) 
          AND mes = EXTRACT(MONTH FROM now())
        FOR UPDATE; -- Lock row for consistency

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Orçamento não configurado para o PA informado neste mês.';
        END IF;

        -- Validar se há saldo suficiente
        IF (current_pa_budget.verba_total - current_pa_budget.verba_consumida) < NEW.total_amount THEN
            RAISE EXCEPTION 'Saldo insuficiente no PA para este pedido. Saldo: %, Pedido: %', 
                (current_pa_budget.verba_total - current_pa_budget.verba_consumida), NEW.total_amount;
        END IF;

        -- Se não for administrador, validar alçada (se não veio de aprovação prévia)
        -- Nota: admin ignora alçada, mas consome saldo.
        
        -- Atualizar verba consumida
        UPDATE public.pa_budgets 
        SET verba_consumida = verba_consumida + NEW.total_amount,
            updated_at = now()
        WHERE id = current_pa_budget.id;

        -- Registrar saldo auditado
        NEW.audit_remaining_budget := (current_pa_budget.verba_total - (current_pa_budget.verba_consumida + NEW.total_amount));
    
    -- Se o pedido for cancelado ou rejeitado após ter sido confirmado
    ELSIF (NEW.status IN ('rejected', 'cancelled') AND OLD.status IN ('confirmed', 'logistic')) THEN
        UPDATE public.pa_budgets 
        SET verba_consumida = verba_consumida - NEW.total_amount,
            updated_at = now()
        WHERE pa_id = current_pa_id 
          AND ano = EXTRACT(YEAR FROM OLD.created_at) 
          AND mes = EXTRACT(MONTH FROM OLD.created_at);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para execução da validação
DROP TRIGGER IF EXISTS trg_validate_sicoob_order_budget ON public.sicoob_orders;
CREATE TRIGGER trg_validate_sicoob_order_budget
BEFORE UPDATE ON public.sicoob_orders
FOR EACH ROW
EXECUTE FUNCTION public.validate_sicoob_order_budget();

-- RPC para o frontend checar disponibilidade sem tentar o update
CREATE OR REPLACE FUNCTION public.check_budget_availability(p_pa_id UUID, p_amount DECIMAL)
RETURNS TABLE (
    has_budget BOOLEAN,
    remaining DECIMAL,
    limit_alcada DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (verba_total - verba_consumida) >= p_amount as has_budget,
        (verba_total - verba_consumida) as remaining,
        limite_alcada
    FROM public.pa_budgets
    WHERE pa_id = p_pa_id 
      AND ano = EXTRACT(YEAR FROM now()) 
      AND mes = EXTRACT(MONTH FROM now());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
