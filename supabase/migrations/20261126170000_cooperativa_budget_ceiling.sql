-- Teto mensal da cooperativa x verba dos PAs.
--
-- `cooperativa_budgets` existia desde 20260502143127 sem nenhum consumidor: o
-- teto agregado podia ser gravado (RLS de gestor em 20261013115605:190-240) e
-- nenhum pedido, verba ou tela o respeitava. Aqui o teto passa a valer:
--   * a soma das verbas dos PAs da cooperativa nao pode passar do teto;
--   * o teto nao pode ser reduzido abaixo do que ja esta distribuido aos PAs;
--   * a transferencia de um PA para outra Singular nao pode estourar o teto de
--     destino, porque as verbas do PA passam a contar la;
--   * duas gravacoes simultaneas na mesma competencia sao serializadas, para
--     que a soma lida por uma ja enxergue a verba confirmada pela outra.
-- Sem linha de teto para a competencia, o comportamento anterior se mantem
-- (verba do PA livre) para nao bloquear cooperativas que ainda nao configuraram.
--
-- Reversao (ver CONTRIBUTING.md):
--   DROP TRIGGER IF EXISTS trg_pa_budget_respects_cooperativa_ceiling ON public.pa_budgets;
--   DROP TRIGGER IF EXISTS trg_cooperativa_budget_not_below_distributed ON public.cooperativa_budgets;
--   DROP TRIGGER IF EXISTS trg_pa_transfer_respects_cooperativa_ceiling ON public.postos_atendimento;
--   DROP FUNCTION IF EXISTS public.tg_pa_budget_respects_cooperativa_ceiling();
--   DROP FUNCTION IF EXISTS public.tg_cooperativa_budget_not_below_distributed();
--   DROP FUNCTION IF EXISTS public.tg_pa_transfer_respects_cooperativa_ceiling();
--   DROP FUNCTION IF EXISTS public.cooperativa_verba_distribuida(uuid, integer, integer);
--   DROP FUNCTION IF EXISTS public._trava_competencia_da_cooperativa(uuid, integer, integer);
--   DROP FUNCTION IF EXISTS public._cooperativa_verba_distribuida(uuid, integer, integer);
--   -- sem DDL anterior a esta migration: nada mais a remover. As policies,
--   -- grants e a unique (cooperativa_id, ano, mes) seguem de 20260502143127.

-- ---------------------------------------------------------------------------
-- Leitura agregada: unica fonte para gatilhos, tela e RPC.
-- ---------------------------------------------------------------------------
-- A soma ignora `postos_atendimento.is_active` de proposito: verba alocada
-- continua comprometida mesmo que o PA seja desativado, e a policy de leitura
-- de PA esconde inativos do gestor (20260502145232:41-46). Sem esta funcao a
-- tela mostraria um total menor do que o que o banco cobra.
CREATE OR REPLACE FUNCTION public._cooperativa_verba_distribuida(
  p_cooperativa_id uuid,
  p_ano integer,
  p_mes integer
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(pb.verba_total), 0)::numeric(14,2)
    FROM public.pa_budgets pb
    JOIN public.postos_atendimento pa ON pa.id = pb.pa_id
   WHERE pa.cooperativa_id = p_cooperativa_id
     AND pb.ano = p_ano
     AND pb.mes = p_mes;
$$;

REVOKE ALL ON FUNCTION public._cooperativa_verba_distribuida(uuid, integer, integer) FROM PUBLIC, anon, authenticated;

-- Um pedido fora do escopo nao pode receber em mensagem de erro valores de
-- outra cooperativa. As tabelas acima nao tem policy de escrita para terceiros,
-- mas o gatilho BEFORE roda antes da verificacao da policy: sem este guarda a
-- excecao ja teria devolvido o total da outra cooperativa.
CREATE OR REPLACE FUNCTION public._pode_ver_verba_da_cooperativa(p_cooperativa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NULL
      OR public.is_admin(auth.uid())
      OR (p_cooperativa_id IS NOT NULL
          AND p_cooperativa_id = public.current_user_cooperativa_id());
$$;

REVOKE ALL ON FUNCTION public._pode_ver_verba_da_cooperativa(uuid) FROM PUBLIC, anon, authenticated;

-- Serializa quem le a soma da mesma competencia (alocacoes e alteracao de
-- teto) para que duas transacoes concorrentes nao decidam sobre o mesmo saldo.
CREATE OR REPLACE FUNCTION public._trava_competencia_da_cooperativa(
  p_cooperativa_id uuid,
  p_ano integer,
  p_mes integer
)
RETURNS void
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pg_advisory_xact_lock(
    hashtextextended(p_cooperativa_id::text || ':' || p_ano::text || ':' || p_mes::text, 0)
  );
$$;

REVOKE ALL ON FUNCTION public._trava_competencia_da_cooperativa(uuid, integer, integer) FROM PUBLIC, anon, authenticated;

-- Total distribuido exposto a tela. Mesmo numero que os gatilhos cobram.
CREATE OR REPLACE FUNCTION public.cooperativa_verba_distribuida(
  p_cooperativa_id uuid,
  p_ano integer,
  p_mes integer
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public._pode_ver_verba_da_cooperativa(p_cooperativa_id) THEN
    RAISE EXCEPTION 'Sem permissao para consultar a verba desta cooperativa.'
      USING ERRCODE = '42501';
  END IF;

  RETURN public._cooperativa_verba_distribuida(p_cooperativa_id, p_ano, p_mes);
END;
$$;

REVOKE ALL ON FUNCTION public.cooperativa_verba_distribuida(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cooperativa_verba_distribuida(uuid, integer, integer) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Verba do PA x teto da cooperativa
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_pa_budget_respects_cooperativa_ceiling()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cooperativa_id     uuid;
  v_cooperativa_antiga uuid;
  v_teto               numeric(14,2);
  v_distribuido        numeric(14,2);
  v_total              numeric(14,2);
  v_detalhado          boolean;
BEGIN
  SELECT pa.cooperativa_id INTO v_cooperativa_id
    FROM public.postos_atendimento pa
   WHERE pa.id = NEW.pa_id;

  IF v_cooperativa_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_detalhado := public._pode_ver_verba_da_cooperativa(v_cooperativa_id);

  PERFORM public._trava_competencia_da_cooperativa(v_cooperativa_id, NEW.ano, NEW.mes);

  SELECT cb.verba_total INTO v_teto
    FROM public.cooperativa_budgets cb
   WHERE cb.cooperativa_id = v_cooperativa_id
     AND cb.ano = NEW.ano
     AND cb.mes = NEW.mes;

  IF v_teto IS NULL THEN
    RETURN NEW;
  END IF;

  v_distribuido := public._cooperativa_verba_distribuida(v_cooperativa_id, NEW.ano, NEW.mes);

  IF TG_OP = 'UPDATE' THEN
    SELECT pa.cooperativa_id INTO v_cooperativa_antiga
      FROM public.postos_atendimento pa
     WHERE pa.id = OLD.pa_id;

    IF v_cooperativa_antiga IS NOT DISTINCT FROM v_cooperativa_id THEN
      v_distribuido := v_distribuido - COALESCE(OLD.verba_total, 0);
    END IF;
  END IF;

  v_total := v_distribuido + COALESCE(NEW.verba_total, 0);

  IF v_total > v_teto THEN
    IF v_detalhado THEN
      RAISE EXCEPTION
        'A soma das verbas dos PAs (R$ %) passaria do teto da cooperativa (R$ %) em %/%; ajuste o teto ou reduza a verba de outro PA.',
        round(v_total, 2)::text, v_teto::text, NEW.mes, NEW.ano
        USING ERRCODE = '23514';
    END IF;

    RAISE EXCEPTION 'As verbas desta competencia ultrapassam o teto da cooperativa.'
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

-- ---------------------------------------------------------------------------
-- Teto da cooperativa x verba ja distribuida
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_cooperativa_budget_not_below_distributed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_distribuido numeric(14,2);
  v_detalhado   boolean;
BEGIN
  v_detalhado := public._pode_ver_verba_da_cooperativa(NEW.cooperativa_id);

  PERFORM public._trava_competencia_da_cooperativa(NEW.cooperativa_id, NEW.ano, NEW.mes);

  v_distribuido := public._cooperativa_verba_distribuida(NEW.cooperativa_id, NEW.ano, NEW.mes);

  IF v_distribuido > COALESCE(NEW.verba_total, 0) THEN
    IF v_detalhado THEN
      RAISE EXCEPTION
        'O teto da cooperativa (R$ %) ficaria abaixo do ja distribuido aos PAs (R$ %) em %/%. Reduza as verbas dos PAs antes de baixar o teto.',
        NEW.verba_total::text, round(v_distribuido, 2)::text, NEW.mes, NEW.ano
        USING ERRCODE = '23514';
    END IF;

    RAISE EXCEPTION 'O teto informado fica abaixo do ja distribuido nesta competencia.'
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

-- ---------------------------------------------------------------------------
-- Transferencia de PA entre Singulares (PAsTab, campo "Singular Responsavel")
-- ---------------------------------------------------------------------------
-- `postos_atendimento.cooperativa_id` decide a que teto as verbas do PA
-- pertencem. Trocar a Singular reclassifica todas as verbas do PA, inclusive as
-- de competencias ja configuradas, sem tocar em `pa_budgets`. Sem o gatilho
-- abaixo a transferencia era gravada mesmo estourando o teto do destino.
--
-- AFTER UPDATE de proposito: a soma lida em `_cooperativa_verba_distribuida`
-- ja enxerga o PA no destino e a policy de escrita ja foi verificada, entao
-- este gatilho nao antecipa valor de outra cooperativa.
CREATE OR REPLACE FUNCTION public.tg_pa_transfer_respects_cooperativa_ceiling()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_competencia record;
  v_teto        numeric(14,2);
  v_soma        numeric(14,2);
  v_detalhado   boolean;
BEGIN
  IF NEW.cooperativa_id IS NOT DISTINCT FROM OLD.cooperativa_id THEN
    RETURN NULL;
  END IF;

  v_detalhado := public._pode_ver_verba_da_cooperativa(NEW.cooperativa_id);

  FOR v_competencia IN
    SELECT DISTINCT pb.ano, pb.mes
      FROM public.pa_budgets pb
     WHERE pb.pa_id = NEW.id
     ORDER BY pb.ano, pb.mes
  LOOP
    PERFORM public._trava_competencia_da_cooperativa(
      NEW.cooperativa_id, v_competencia.ano, v_competencia.mes
    );

    SELECT cb.verba_total INTO v_teto
      FROM public.cooperativa_budgets cb
     WHERE cb.cooperativa_id = NEW.cooperativa_id
       AND cb.ano = v_competencia.ano
       AND cb.mes = v_competencia.mes;

    CONTINUE WHEN v_teto IS NULL;

    v_soma := public._cooperativa_verba_distribuida(
      NEW.cooperativa_id, v_competencia.ano, v_competencia.mes
    );

    IF v_soma > v_teto THEN
      IF v_detalhado THEN
        RAISE EXCEPTION
          'A transferencia levaria as verbas da cooperativa de destino a R$ % em %/%, acima do teto de R$ %. Ajuste o teto do destino ou reduza a verba do PA.',
          round(v_soma, 2)::text, v_competencia.mes, v_competencia.ano, v_teto::text
          USING ERRCODE = '23514';
      END IF;

      RAISE EXCEPTION 'A transferencia de PA ultrapassa o teto da cooperativa de destino.'
        USING ERRCODE = '23514';
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.tg_pa_transfer_respects_cooperativa_ceiling() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_pa_transfer_respects_cooperativa_ceiling ON public.postos_atendimento;
CREATE TRIGGER trg_pa_transfer_respects_cooperativa_ceiling
AFTER UPDATE OF cooperativa_id ON public.postos_atendimento
FOR EACH ROW EXECUTE FUNCTION public.tg_pa_transfer_respects_cooperativa_ceiling();
