-- Refinar política de leitura para itens de pedido (exigindo isolamento explícito)
DROP POLICY IF EXISTS "Users can view items of orders they can see" ON public.sicoob_order_items;

CREATE POLICY "Users can view items of their PA orders"
ON public.sicoob_order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sicoob_orders o
    WHERE o.id = sicoob_order_items.order_id
    AND (
        o.pa_id = public.current_user_pa_id() 
        OR o.cooperative_id = public.current_user_cooperativa_id()
        OR public.has_role(auth.uid(), 'admin')
    )
  )
);
