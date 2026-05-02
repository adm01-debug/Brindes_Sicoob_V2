-- Adiciona constraints para pa_budgets
ALTER TABLE public.pa_budgets
ADD CONSTRAINT check_verba_total_positive CHECK (verba_total > 0),
ADD CONSTRAINT check_limite_alcada_non_negative CHECK (limite_alcada >= 0),
ADD CONSTRAINT check_limite_alcada_within_budget CHECK (limite_alcada <= verba_total),
ADD CONSTRAINT check_ano_range CHECK (ano >= 2000 AND ano <= 2100),
ADD CONSTRAINT check_mes_range CHECK (mes >= 1 AND mes <= 12);

-- Adiciona constraints para cooperativa_budgets
ALTER TABLE public.cooperativa_budgets
ADD CONSTRAINT check_verba_total_positive CHECK (verba_total > 0),
ADD CONSTRAINT check_limite_alcada_non_negative CHECK (limite_alcada >= 0),
ADD CONSTRAINT check_limite_alcada_within_budget CHECK (limite_alcada <= verba_total),
ADD CONSTRAINT check_ano_range CHECK (ano >= 2000 AND ano <= 2100),
ADD CONSTRAINT check_mes_range CHECK (mes >= 1 AND mes <= 12);