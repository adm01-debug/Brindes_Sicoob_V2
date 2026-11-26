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
--     que a soma lida por uma ja enxergue a verba confirmada pela outra;
--   * a gravacao da verba espera uma transferencia de PA em andamento
--     (`FOR SHARE` em `postos_atendimento`) e a transferencia reavalia a soma
--     ja com a verba confirmada, para que as duas operacoes sobre o mesmo PA
--     nao se cruzem;
--   * a escrita da verba passa pela RPC `salvar_verba_pa`, que bloqueia o PA
--     antes da verba. A exclusao de um PA chega nas verbas pela cascata (PA
--     primeiro) e o UPDATE direto do app bloqueava a verba primeiro: as duas
--     transacoes se travavam (deadlock 40P01) quando coincidiam;
--   * a soma agregada so e liberada para quem ja enxerga as verbas da
--     Singular inteira (admin, gestor_compras ou comprador_singular do
--     proprio vinculo) — comprador restrito a um PA nao ve o total.
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
--   DROP FUNCTION IF EXISTS public.salvar_verba_pa(uuid, integer, integer, numeric, numeric, text, uuid);
--   DROP FUNCTION IF EXISTS public._trava_pa_da_verba(uuid);
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
SET search_path = public
AS $$
  SELECT COALESCE(
    auth.uid() IS NULL
    OR public.is_admin(auth.uid())
    OR (p_cooperativa_id IS NOT NULL
        AND p_cooperativa_id = public.current_user_cooperativa_id()
        AND (public.has_role(auth.uid(), 'gestor_compras'::public.app_role)
             OR public.has_role(auth.uid(), 'comprador_singular'::public.app_role))),
    false
  );
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
  IF public._pode_ver_verba_da_cooperativa(p_cooperativa_id) IS NOT TRUE THEN
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
  -- FOR SHARE: espera uma transferencia de PA em andamento e o relê já no
  -- destino, para nao validar a verba contra o teto da Singular de origem.
  SELECT pa.cooperativa_id INTO v_cooperativa_id
    FROM public.postos_atendimento pa
   WHERE pa.id = NEW.pa_id
     FOR SHARE;

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

    -- O valor antigo so faz parte da soma da competencia de destino quando a
    -- competencia nao mudou; ao mover entre meses ele pertence a outra soma.
    IF v_cooperativa_antiga IS NOT DISTINCT FROM v_cooperativa_id
       AND OLD.ano = NEW.ano
       AND OLD.mes = NEW.mes THEN
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

-- ---------------------------------------------------------------------------
-- Escrita da verba: ordem de bloqueio PA -> verba
-- ---------------------------------------------------------------------------
-- A exclusao de um PA chega em `pa_budgets` pela cascata da FK
-- (20260502143127:67-79): bloqueia a linha do PA e so depois as verbas. O
-- UPDATE direto do app fazia o inverso — o PostgreSQL bloqueia a linha da
-- verba antes de o gatilho do teto pedir o PA — e as duas transacoes se
-- travavam (deadlock 40P01) quando coincidiam. Esta RPC roda na mesma
-- transacao da escrita e pega o PA antes, na ordem da exclusao.
-- A RPC e SECURITY INVOKER de proposito: as policies de RLS de `pa_budgets`
-- continuam valendo para quem chama. O bloqueio do PA fica numa funcao
-- SECURITY DEFINER separada porque `FOR SHARE` exige privilegio de escrita na
-- tabela e a escrita da verba nao pode depender disso.
CREATE OR REPLACE FUNCTION public._trava_pa_da_verba(p_pa_id uuid)
RETURNS void
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 1 FROM public.postos_atendimento pa WHERE pa.id = p_pa_id FOR SHARE;
$$;

REVOKE ALL ON FUNCTION public._trava_pa_da_verba(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._trava_pa_da_verba(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.salvar_verba_pa(
  p_pa_id uuid,
  p_ano integer,
  p_mes integer,
  p_verba_total numeric,
  p_limite_alcada numeric DEFAULT NULL,
  p_observacoes text DEFAULT NULL,
  p_budget_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_budget_id uuid;
BEGIN
  IF p_pa_id IS NULL THEN
    RAISE EXCEPTION 'Informe o posto de atendimento da verba.' USING ERRCODE = '22023';
  END IF;

  -- Mesmo primeiro bloqueio da exclusao de PA. Sem ele o gatilho do teto
  -- pegaria o PA depois da verba e o deadlock continuaria possivel.
  PERFORM public._trava_pa_da_verba(p_pa_id);

  IF p_budget_id IS NULL THEN
    -- O id sai daqui em vez de vir de RETURNING: INSERT/UPDATE ... RETURNING
    -- exige que a linha nova esteja visivel pelas policies de SELECT do
    -- chamador, e quem tem autoridade de escrita sem leitura receberia um
    -- falso "new row violates row-level security policy".
    v_budget_id := gen_random_uuid();

    INSERT INTO public.pa_budgets (id, pa_id, ano, mes, verba_total, limite_alcada, observacoes)
    VALUES (v_budget_id, p_pa_id, p_ano, p_mes, p_verba_total, p_limite_alcada, p_observacoes);
  ELSE
    UPDATE public.pa_budgets
       SET pa_id = p_pa_id,
           ano = p_ano,
           mes = p_mes,
           verba_total = p_verba_total,
           limite_alcada = p_limite_alcada,
           observacoes = p_observacoes
     WHERE id = p_budget_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Verba nao encontrada.' USING ERRCODE = 'P0002';
    END IF;

    v_budget_id := p_budget_id;
  END IF;

  RETURN v_budget_id;
END;
$$;

REVOKE ALL ON FUNCTION public.salvar_verba_pa(uuid, integer, integer, numeric, numeric, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.salvar_verba_pa(uuid, integer, integer, numeric, numeric, text, uuid) TO authenticated, service_role;
