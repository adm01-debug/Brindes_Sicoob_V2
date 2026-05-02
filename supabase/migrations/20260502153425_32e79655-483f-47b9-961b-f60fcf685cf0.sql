-- Permitir que Gestores de Cooperativa vejam orçamentos de todos os seus PAs
CREATE POLICY "Gestores can view budgets of their cooperative PAs"
ON public.pa_budgets
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.postos_atendimento pa
    WHERE pa.id = pa_budgets.pa_id
    AND pa.cooperativa_id = public.current_user_cooperativa_id()
    AND public.has_role(auth.uid(), 'gestor_compras')
  )
);

CREATE POLICY "Gestores can manage budgets of their cooperative PAs"
ON public.pa_budgets
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.postos_atendimento pa
    WHERE pa.id = pa_budgets.pa_id
    AND pa.cooperativa_id = public.current_user_cooperativa_id()
    AND public.has_role(auth.uid(), 'gestor_compras')
  )
);
