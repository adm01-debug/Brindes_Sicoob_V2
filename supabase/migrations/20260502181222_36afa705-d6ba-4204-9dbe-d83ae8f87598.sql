-- Função para validar transição de status de fulfillment
CREATE OR REPLACE FUNCTION public.check_fulfillment_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o status não mudou, ok
    IF (OLD.fulfillment_status = NEW.fulfillment_status) THEN
        RETURN NEW;
    END IF;

    -- Regras de transição (mesma lógica do frontend para consistência)
    -- pending -> [in_production, cancelled]
    -- in_production -> [in_separation, cancelled]
    -- in_separation -> [in_transit, cancelled]
    -- in_transit -> [delivered, cancelled]
    -- delivered -> [completed, cancelled]
    
    IF (OLD.fulfillment_status = 'pending' AND NEW.fulfillment_status NOT IN ('in_production', 'cancelled')) OR
       (OLD.fulfillment_status = 'in_production' AND NEW.fulfillment_status NOT IN ('in_separation', 'cancelled')) OR
       (OLD.fulfillment_status = 'in_separation' AND NEW.fulfillment_status NOT IN ('in_transit', 'cancelled')) OR
       (OLD.fulfillment_status = 'in_transit' AND NEW.fulfillment_status NOT IN ('delivered', 'cancelled')) OR
       (OLD.fulfillment_status = 'delivered' AND NEW.fulfillment_status NOT IN ('completed', 'cancelled')) OR
       (OLD.fulfillment_status = 'completed') OR
       (OLD.fulfillment_status = 'cancelled') THEN
        RAISE EXCEPTION 'Transição de status de fulfillment inválida: de % para %', OLD.fulfillment_status, NEW.fulfillment_status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar transições na tabela orders
DROP TRIGGER IF EXISTS tr_check_fulfillment_transition ON public.orders;
CREATE TRIGGER tr_check_fulfillment_transition
BEFORE UPDATE OF fulfillment_status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.check_fulfillment_transition();

-- Políticas de RLS para tabelas sensíveis baseadas em roles (supervisor+)
-- Nota: Assume-se que a tabela user_roles ou similar gerencia as roles

ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Supervisors can view all payments" ON public.order_payments;
CREATE POLICY "Supervisors can view all payments" 
ON public.order_payments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role IN ('supervisor', 'dev', 'admin', 'manager'))
  )
);

-- Auditoria: Garantir que eventos de auditoria não sejam deletados
ALTER TABLE public.order_audit_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Audit events are read-only" ON public.order_audit_events;
CREATE POLICY "Audit events are read-only" 
ON public.order_audit_events 
FOR SELECT 
USING (true);

CREATE POLICY "No deletes on audit events" 
ON public.order_audit_events 
FOR DELETE 
USING (false);
