-- Melhora a validação de transição de status no DB
CREATE OR REPLACE FUNCTION public.validate_order_fulfillment_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o status não mudou, ok
  IF (OLD.fulfillment_status = NEW.fulfillment_status) THEN
    RETURN NEW;
  END IF;

  -- Regras de transição
  -- pendente -> em_producao, cancelado
  -- em_producao -> em_separacao, cancelado
  -- em_separacao -> em_transporte, cancelado
  -- em_transporte -> entregue, cancelado
  -- entregue -> concluido, cancelado

  IF OLD.fulfillment_status = 'pending' AND NEW.fulfillment_status NOT IN ('in_production', 'cancelled') THEN
    RAISE EXCEPTION 'Transição de fulfillment inválida: % -> %', OLD.fulfillment_status, NEW.fulfillment_status;
  END IF;

  IF OLD.fulfillment_status = 'in_production' AND NEW.fulfillment_status NOT IN ('in_separation', 'cancelled') THEN
    RAISE EXCEPTION 'Transição de fulfillment inválida: % -> %', OLD.fulfillment_status, NEW.fulfillment_status;
  END IF;

  IF OLD.fulfillment_status = 'in_separation' AND NEW.fulfillment_status NOT IN ('in_transit', 'cancelled') THEN
    RAISE EXCEPTION 'Transição de fulfillment inválida: % -> %', OLD.fulfillment_status, NEW.fulfillment_status;
  END IF;

  IF OLD.fulfillment_status = 'in_transit' AND NEW.fulfillment_status NOT IN ('delivered', 'cancelled') THEN
    RAISE EXCEPTION 'Transição de fulfillment inválida: % -> %', OLD.fulfillment_status, NEW.fulfillment_status;
  END IF;

  IF OLD.fulfillment_status = 'delivered' AND NEW.fulfillment_status NOT IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Transição de fulfillment inválida: % -> %', OLD.fulfillment_status, NEW.fulfillment_status;
  END IF;

  IF OLD.fulfillment_status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Não é possível alterar o status de um pedido concluído ou cancelado';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_validate_order_fulfillment ON public.orders;
CREATE TRIGGER tr_validate_order_fulfillment
BEFORE UPDATE OF fulfillment_status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.validate_order_fulfillment_transition();

-- Garante que o bucket order-documents existe e tem RLS
INSERT INTO storage.buckets (id, name, public) 
VALUES ('order-documents', 'order-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas para o bucket
CREATE POLICY "Usuários autenticados podem ver documentos de pedidos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'order-documents');

CREATE POLICY "Usuários autenticados podem subir documentos de pedidos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'order-documents');
