-- O histórico é evidência operacional. A política anterior FOR ALL permitia
-- que um ator com acesso ao orçamento alterasse/apagasse eventos e atribuísse
-- o evento a outro usuário. Mantém leitura no escopo do orçamento, permite
-- somente inserção pelo próprio ator e não cria políticas de UPDATE/DELETE.

DROP POLICY IF EXISTS "Users can manage history via quote ownership" ON public.quote_history;
DROP POLICY IF EXISTS "quote_history_select_scope" ON public.quote_history;
DROP POLICY IF EXISTS "quote_history_insert_actor" ON public.quote_history;

CREATE POLICY "quote_history_select_scope"
ON public.quote_history
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.quotes q
    WHERE q.id = quote_history.quote_id
      AND (q.seller_id = auth.uid() OR public.can_manage_quotes(auth.uid()))
  )
);

CREATE POLICY "quote_history_insert_actor"
ON public.quote_history
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.quotes q
    WHERE q.id = quote_history.quote_id
      AND (q.seller_id = auth.uid() OR public.can_manage_quotes(auth.uid()))
  )
);

COMMENT ON TABLE public.quote_history IS
  'Trilha de auditoria imutável de orçamentos; usuários autenticados apenas inserem eventos em seu próprio nome.';
