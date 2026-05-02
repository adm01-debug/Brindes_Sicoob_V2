-- Habilitar RLS se não estiver
ALTER TABLE public.sicoob_order_items ENABLE ROW LEVEL SECURITY;

-- Políticas para sicoob_order_items baseadas no acesso ao pedido pai (sicoob_orders)
CREATE POLICY "Users can view items of orders they can see"
ON public.sicoob_order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sicoob_orders o
    WHERE o.id = sicoob_order_items.order_id
  )
);

CREATE POLICY "Creators can insert items to their own draft orders"
ON public.sicoob_order_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sicoob_orders o
    WHERE o.id = sicoob_order_items.order_id
    AND o.created_by = auth.uid()
    AND o.status = 'draft'
  )
);

CREATE POLICY "Creators can delete items from their own draft orders"
ON public.sicoob_order_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.sicoob_orders o
    WHERE o.id = sicoob_order_items.order_id
    AND o.created_by = auth.uid()
    AND o.status = 'draft'
  )
);
