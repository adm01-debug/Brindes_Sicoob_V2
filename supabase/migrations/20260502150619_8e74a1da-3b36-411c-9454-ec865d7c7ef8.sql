-- Habilita RLS (já deve estar habilitado, mas garante)
ALTER TABLE public.sicoob_order_history ENABLE ROW LEVEL SECURITY;

-- Política para visualização: quem pode ver o pedido pode ver o histórico
CREATE POLICY "Users can view history of orders they can see" 
ON public.sicoob_order_history 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.sicoob_orders o 
    WHERE o.id = sicoob_order_history.order_id
  )
);

-- Política para inserção: usuários autenticados podem inserir histórico
CREATE POLICY "Users can insert order history" 
ON public.sicoob_order_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);
