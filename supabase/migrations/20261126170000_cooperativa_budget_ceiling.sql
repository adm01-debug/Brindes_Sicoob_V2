-- Teto mensal da cooperativa x verba dos PAs.
--
-- `cooperativa_budgets` existia desde 20260502143127 sem nenhum consumidor: o
-- teto agregado podia ser gravado (RLS de gestor em 20261013115605:190-240) e
-- nenhum pedido, verba ou tela o respeitava. Aqui o teto passa a valer:
--   * a soma das verbas dos PAs da cooperativa nao pode passar do teto;
--   * o teto nao pode ser reduzido abaixo do que ja esta distribuido aos PAs.
-- Sem linha de teto para a competencia, o comportamento anterior se mantem
-- (verba do PA livre) para nao bloquear cooperativas que ainda nao configuraram.

CREATE OR REPLACE FUNCTION public.tg_pa_budget_respects_cooperativa_ceiling()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cooperativa_id uuid;
  v_teto           numeric(14,2);
  v_distribuido    numeric(14,2);
BEGIN
  SELECT pa.cooperativa_id INTO v_cooperativa_id
    FROM public.postos_atendimento pa
   WHERE pa.id = NEW.pa_id;

  IF v_cooperativa_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT cb.verba_total INTO v_teto
    FROM public.cooperativa_budgets cb
   WHERE cb.cooperativa_id = v_cooperativa_id
     AND cb.ano = NEW.ano
     AND cb.mes = NEW.mes;

  IF v_teto IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(pb.verba_total), 0) INTO v_distribuido
    FROM public.pa_budgets pb
    JOIN public.postos_atendimento pa ON pa.id = pb.pa_id
   WHERE pa.cooperativa_id = v_cooperativa_id
     AND pb.ano = NEW.ano
     AND pb.mes = NEW.mes
     AND pb.id IS DISTINCT FROM NEW.id;

  IF v_distribuido + NEW.verba_total > v_teto THEN
    RAISE EXCEPTION
      'A soma das verbas dos PAs (R$ %) passaria do teto da cooperativa (R$ %) em %/%; ajuste o teto ou reduza a verba de outro PA.',
      round(v_distribuido + NEW.verba_total, 2)::text, v_teto::text, NEW.mes, NEW.ano
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.tg_pa_budget_respects_cooperativa_ceiling() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_pa_budget_respects_cooperativa_ceiling ON public.pa_budgets;
CREATE TRIGGER trg_pa_budget_respects_cooperativa_ceiling
BEFORE INSERT OR UPDATE OF verba_total, ano, mes, pa_id ON public.pa_budgets
FOR EACH ROW EXECUTE FUNCTION public.tg_pa_budget_respects_cooperativa_ceiling();

CREATE OR REPLACE FUNCTION public.tg_cooperativa_budget_not_below_distributed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_distribuido numeric(14,2);
BEGIN
  SELECT COALESCE(SUM(pb.verba_total), 0) INTO v_distribuido
    FROM public.pa_budgets pb
    JOIN public.postos_atendimento pa ON pa.id = pb.pa_id
   WHERE pa.cooperativa_id = NEW.cooperativa_id
     AND pb.ano = NEW.ano
     AND pb.mes = NEW.mes;

  IF v_distribuido > NEW.verba_total THEN
    RAISE EXCEPTION
      'O teto da cooperativa (R$ %) ficaria abaixo do ja distribuido aos PAs (R$ %) em %/%. Reduza as verbas dos PAs antes de baixar o teto.',
      NEW.verba_total::text, round(v_distribuido, 2)::text, NEW.mes, NEW.ano
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.tg_cooperativa_budget_not_below_distributed() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_cooperativa_budget_not_below_distributed ON public.cooperativa_budgets;
CREATE TRIGGER trg_cooperativa_budget_not_below_distributed
BEFORE INSERT OR UPDATE OF verba_total, ano, mes ON public.cooperativa_budgets
FOR EACH ROW EXECUTE FUNCTION public.tg_cooperativa_budget_not_below_distributed();
