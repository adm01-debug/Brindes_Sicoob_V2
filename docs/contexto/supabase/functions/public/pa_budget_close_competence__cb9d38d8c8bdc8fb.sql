CREATE OR REPLACE FUNCTION public.pa_budget_close_competence(p_pa_id uuid, p_ano integer, p_mes integer, p_fechar boolean DEFAULT true)
 RETURNS pa_budgets
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_budget public.pa_budgets%ROWTYPE;
BEGIN
  IF NOT public.is_admin((SELECT auth.uid())) THEN
    IF NOT (public.is_gestor_compras() AND public.user_can_access_pa(p_pa_id)) THEN
      RAISE EXCEPTION 'Apenas admin ou gestor de compras do PA pode fechar competência.';
    END IF;
  END IF;

  UPDATE public.pa_budgets
     SET fechada_em = CASE WHEN p_fechar THEN now() ELSE NULL END,
         fechada_por = CASE WHEN p_fechar THEN auth.uid() ELSE NULL END,
         updated_at = now()
   WHERE pa_id = p_pa_id AND ano = p_ano AND mes = p_mes
   RETURNING * INTO v_budget;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verba do PA % na competência %/% não existe.', p_pa_id, p_mes, p_ano;
  END IF;

  RETURN v_budget;
END;
$function$
