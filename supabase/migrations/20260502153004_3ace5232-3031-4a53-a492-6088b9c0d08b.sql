-- Tabela de logs para itens de pedido
CREATE TABLE IF NOT EXISTS public.sicoob_order_item_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.sicoob_orders(id) ON DELETE CASCADE,
    item_id UUID NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS nos logs
ALTER TABLE public.sicoob_order_item_logs ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver logs de itens de pedidos que eles têm acesso
CREATE POLICY "Users can view logs of orders they can see"
ON public.sicoob_order_item_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sicoob_orders o
    WHERE o.id = sicoob_order_item_logs.order_id
  )
);

-- Função de trigger para auditoria automática
CREATE OR REPLACE FUNCTION public.audit_sicoob_order_item_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.sicoob_order_item_logs (order_id, item_id, user_id, action, new_data)
        VALUES (NEW.order_id, NEW.id, auth.uid(), 'INSERT', row_to_json(NEW)::jsonb);
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.sicoob_order_item_logs (order_id, item_id, user_id, action, old_data, new_data)
        VALUES (NEW.order_id, NEW.id, auth.uid(), 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.sicoob_order_item_logs (order_id, item_id, user_id, action, old_data)
        VALUES (OLD.order_id, OLD.id, auth.uid(), 'DELETE', row_to_json(OLD)::jsonb);
    END IF;
    RETURN NULL;
END;
$$;

-- Criar trigger na tabela de itens
DROP TRIGGER IF EXISTS trg_audit_sicoob_order_items ON public.sicoob_order_items;
CREATE TRIGGER trg_audit_sicoob_order_items
AFTER INSERT OR UPDATE OR DELETE ON public.sicoob_order_items
FOR EACH ROW
EXECUTE FUNCTION public.audit_sicoob_order_item_changes();
