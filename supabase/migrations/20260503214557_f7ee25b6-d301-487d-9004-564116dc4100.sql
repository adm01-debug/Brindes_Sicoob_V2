-- Ajustar funções com search_path seguro
CREATE OR REPLACE FUNCTION public.validate_sicoob_order_budget()
RETURNS TRIGGER AS $$
DECLARE
    current_pa_budget RECORD;
    current_pa_id UUID;
BEGIN
    SELECT pa_id INTO current_pa_id FROM public.sicoob_orders WHERE id = NEW.id;
    
    IF (NEW.status IN ('confirmed', 'logistic') AND (OLD.status IS NULL OR OLD.status NOT IN ('confirmed', 'logistic'))) THEN
        SELECT * INTO current_pa_budget 
        FROM public.pa_budgets 
        WHERE pa_id = current_pa_id 
          AND ano = EXTRACT(YEAR FROM now()) 
          AND mes = EXTRACT(MONTH FROM now())
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Orçamento não configurado para o PA informado neste mês.';
        END IF;

        IF (current_pa_budget.verba_total - current_pa_budget.verba_consumida) < NEW.total_amount THEN
            RAISE EXCEPTION 'Saldo insuficiente no PA para este pedido. Saldo: %, Pedido: %', 
                (current_pa_budget.verba_total - current_pa_budget.verba_consumida), NEW.total_amount;
        END IF;
        
        UPDATE public.pa_budgets 
        SET verba_consumida = verba_consumida + NEW.total_amount,
            updated_at = now()
        WHERE id = current_pa_budget.id;

        NEW.audit_remaining_budget := (current_pa_budget.verba_total - (current_pa_budget.verba_consumida + NEW.total_amount));
    
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- View de Auditoria para QA 10/10
CREATE OR REPLACE VIEW public.sicoob_budget_audit AS
SELECT 
    pb.pa_id,
    pa.nome as pa_nome,
    pb.ano,
    pb.mes,
    pb.verba_total,
    pb.verba_consumida as verba_registrada,
    COALESCE(SUM(so.total_amount), 0) as verba_calculada_pedidos,
    (pb.verba_consumida - COALESCE(SUM(so.total_amount), 0)) as discrepancia
FROM public.pa_budgets pb
JOIN public.postos_atendimento pa ON pb.pa_id = pa.id
LEFT JOIN public.sicoob_orders so ON so.pa_id = pb.pa_id 
    AND so.status IN ('confirmed', 'logistic', 'completed')
    AND EXTRACT(YEAR FROM so.created_at) = pb.ano
    AND EXTRACT(MONTH FROM so.created_at) = pb.mes
GROUP BY pb.id, pa.nome;
