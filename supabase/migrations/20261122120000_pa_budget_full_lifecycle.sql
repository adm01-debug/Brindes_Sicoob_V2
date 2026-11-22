-- PLB-29 (centro de custo e rateio) + PLB-32 (verba com quatro estados,
-- competência e centro de custo) — achado G17 da auditoria de 13/10.
--
-- Antes: `pa_budgets` só tinha `verba_total`/`verba_consumida`, e um trigger
-- somava o pedido inteiro ao consumir. Não havia reserva, compromisso,
-- liberação, fechamento de competência, nem centro de custo/rateio.
-- Depois: o saldo passa a ser derivado de um livro de eventos auditável
-- (`pa_budget_entries`), e cada pedido guarda a parcela de verba que reserva
-- ou consome (`pa_budget_allocations`), com centro de custo rateado.
--
-- `verba_consumida` continua existindo e é mantida pelo livro, para que o
-- restante do sistema (hooks, telas, triggers legados) não quebre.

-- ============================================================================
-- 1. Centro de custo
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cost_centers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cooperativa_id UUID NOT NULL REFERENCES public.cooperativas(id) ON DELETE CASCADE,
  codigo         TEXT NOT NULL,
  nome           TEXT NOT NULL,
  ativo          BOOLEAN NOT NULL DEFAULT true,
  observacoes    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cost_centers_codigo_nao_vazio CHECK (btrim(codigo) <> ''),
  CONSTRAINT cost_centers_coop_codigo_uk UNIQUE (cooperativa_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_cost_centers_coop ON public.cost_centers(cooperativa_id) WHERE ativo;

-- ============================================================================
-- 2. Quatro estados da verba
-- ============================================================================
-- verba_planejada  — o que foi aprovado para a competência (verba_total legado)
-- verba_reservada  — comprometido por pedidos ainda não confirmados
-- verba_comprometida — confirmado, aguardando consumo (logística)
-- verba_consumida   — efetivamente gasto
ALTER TABLE public.pa_budgets
  ADD COLUMN IF NOT EXISTS verba_planejada    NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS verba_reservada    NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verba_comprometida NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_center_id     UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fechada_em         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fechada_por        UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- verba_planejada nasce espelhando o total legado, para bases já existentes.
UPDATE public.pa_budgets
   SET verba_planejada = verba_total
 WHERE verba_planejada IS NULL;

ALTER TABLE public.pa_budgets
  ALTER COLUMN verba_planejada SET DEFAULT 0,
  ALTER COLUMN verba_planejada SET NOT NULL;

ALTER TABLE public.pa_budgets
  ADD CONSTRAINT pa_budgets_estados_nao_negativos CHECK (
    verba_planejada >= 0 AND verba_reservada >= 0
    AND verba_comprometida >= 0 AND verba_consumida >= 0
  );

CREATE INDEX IF NOT EXISTS idx_pa_budgets_cost_center ON public.pa_budgets(cost_center_id);

-- `verba_total` continua sendo a coluna que o app legado escreve; ele é o
-- mesmo valor de `verba_planejada`. Sincronizar aqui evita que uma verba
-- criada pelo caminho antigo nasça com planejado zerado (e portanto sem saldo).
CREATE OR REPLACE FUNCTION public.tg_sync_pa_budget_planejada()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.verba_planejada IS NULL OR NEW.verba_planejada = 0 THEN
      NEW.verba_planejada := COALESCE(NEW.verba_total, 0);
    ELSE
      NEW.verba_total := NEW.verba_planejada;
    END IF;
  ELSE
    IF NEW.verba_planejada IS DISTINCT FROM OLD.verba_planejada THEN
      NEW.verba_total := NEW.verba_planejada;
    ELSIF NEW.verba_total IS DISTINCT FROM OLD.verba_total THEN
      NEW.verba_planejada := NEW.verba_total;
    END IF;
  END IF;
  NEW.verba_total := NEW.verba_planejada;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_pa_budget_planejada ON public.pa_budgets;
CREATE TRIGGER trg_sync_pa_budget_planejada
  BEFORE INSERT OR UPDATE ON public.pa_budgets
  FOR EACH ROW EXECUTE FUNCTION public.tg_sync_pa_budget_planejada();

-- ============================================================================
-- 3. Livro de eventos da verba (auditável, imutável)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pa_budget_entries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pa_budget_id   UUID NOT NULL REFERENCES public.pa_budgets(id) ON DELETE CASCADE,
  pa_id          UUID NOT NULL REFERENCES public.postos_atendimento(id) ON DELETE CASCADE,
  competencia_ano  INT NOT NULL,
  competencia_mes  INT NOT NULL,
  cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  -- reserva | liberacao | compromisso | consumo | estorno | ajuste
  tipo           TEXT NOT NULL,
  -- Estado que este evento altera: cada evento muda UM estado.
  estado         TEXT NOT NULL,
  -- Delta assinado: positivo aumenta o estado, negativo reduz.
  valor          NUMERIC(14,2) NOT NULL,
  order_id       UUID REFERENCES public.sicoob_orders(id) ON DELETE SET NULL,
  motivo         TEXT,
  actor_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pa_budget_entries_tipo_valido CHECK (
    tipo IN ('reserva', 'liberacao', 'compromisso', 'consumo', 'estorno', 'ajuste')
  ),
  CONSTRAINT pa_budget_entries_estado_valido CHECK (
    estado IN ('reservado', 'comprometido', 'consumido')
  ),
  CONSTRAINT pa_budget_entries_valor_nao_zero CHECK (valor <> 0),
  CONSTRAINT pa_budget_entries_competencia_valida CHECK (
    competencia_mes BETWEEN 1 AND 12 AND competencia_ano BETWEEN 2024 AND 2100
  )
);

CREATE INDEX IF NOT EXISTS idx_pbe_budget ON public.pa_budget_entries(pa_budget_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pbe_order ON public.pa_budget_entries(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pbe_competencia ON public.pa_budget_entries(competencia_ano, competencia_mes);
CREATE INDEX IF NOT EXISTS idx_pbe_estado ON public.pa_budget_entries(pa_budget_id, estado);

-- ============================================================================
-- 4. Alocação do pedido por centro de custo (rateio)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pa_budget_allocations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID NOT NULL REFERENCES public.sicoob_orders(id) ON DELETE CASCADE,
  cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE RESTRICT,
  valor          NUMERIC(14,2) NOT NULL CHECK (valor >= 0),
  percentual     NUMERIC(5,2) NOT NULL CHECK (percentual > 0 AND percentual <= 100),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pa_budget_allocations_order_cc_uk UNIQUE (order_id, cost_center_id)
);

CREATE INDEX IF NOT EXISTS idx_pba_order ON public.pa_budget_allocations(order_id);
CREATE INDEX IF NOT EXISTS idx_pba_cost_center ON public.pa_budget_allocations(cost_center_id);

-- ============================================================================
-- 5. Recalcular os quatro estados a partir do livro
-- ============================================================================
CREATE OR REPLACE FUNCTION public.tg_recalc_pa_budget_states()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_budget_id UUID;
BEGIN
  v_budget_id := COALESCE(NEW.pa_budget_id, OLD.pa_budget_id);

  UPDATE public.pa_budgets b
     SET verba_reservada = COALESCE((
           SELECT sum(e.valor) FROM public.pa_budget_entries e
            WHERE e.pa_budget_id = v_budget_id AND e.estado = 'reservado'
         ), 0),
         verba_comprometida = COALESCE((
           SELECT sum(e.valor) FROM public.pa_budget_entries e
            WHERE e.pa_budget_id = v_budget_id AND e.estado = 'comprometido'
         ), 0),
         verba_consumida = COALESCE((
           SELECT sum(e.valor) FROM public.pa_budget_entries e
            WHERE e.pa_budget_id = v_budget_id AND e.estado = 'consumido'
         ), 0),
         updated_at = now()
   WHERE b.id = v_budget_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_pa_budget_states ON public.pa_budget_entries;
CREATE TRIGGER trg_recalc_pa_budget_states
  AFTER INSERT OR UPDATE OR DELETE ON public.pa_budget_entries
  FOR EACH ROW EXECUTE FUNCTION public.tg_recalc_pa_budget_states();

-- O livro é imutável: corrigir posição financeira exige novo evento (estorno/ajuste).
CREATE OR REPLACE FUNCTION public.tg_pa_budget_entries_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'O livro de verba é imutável; registre um evento de estorno ou ajuste.';
END;
$$;

DROP TRIGGER IF EXISTS trg_pa_budget_entries_imutavel ON public.pa_budget_entries;
CREATE TRIGGER trg_pa_budget_entries_imutavel
  BEFORE UPDATE OR DELETE ON public.pa_budget_entries
  FOR EACH ROW EXECUTE FUNCTION public.tg_pa_budget_entries_immutable();

-- ============================================================================
-- 6. Bloquear movimento em competência fechada
-- ============================================================================
CREATE OR REPLACE FUNCTION public.tg_pa_budget_entries_competencia_aberta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fechada TIMESTAMPTZ;
BEGIN
  SELECT fechada_em INTO v_fechada
    FROM public.pa_budgets
   WHERE id = NEW.pa_budget_id;

  IF v_fechada IS NOT NULL THEN
    RAISE EXCEPTION 'Competência %/% fechada; movimentos de verba estão bloqueados.',
      NEW.competencia_mes, NEW.competencia_ano;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pa_budget_entries_competencia ON public.pa_budget_entries;
CREATE TRIGGER trg_pa_budget_entries_competencia
  BEFORE INSERT ON public.pa_budget_entries
  FOR EACH ROW EXECUTE FUNCTION public.tg_pa_budget_entries_competencia_aberta();

-- ============================================================================
-- 7. Centro de custo do pedido: padrão do PA, com rateio opcional
-- ============================================================================
ALTER TABLE public.sicoob_orders
  ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.tg_set_order_cost_center()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.cost_center_id IS NULL AND NEW.pa_id IS NOT NULL THEN
    SELECT b.cost_center_id INTO NEW.cost_center_id
      FROM public.pa_budgets b
     WHERE b.pa_id = NEW.pa_id
       AND b.ano = EXTRACT(YEAR FROM COALESCE(NEW.created_at, now()))::INT
       AND b.mes = EXTRACT(MONTH FROM COALESCE(NEW.created_at, now()))::INT
     LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_order_cost_center ON public.sicoob_orders;
CREATE TRIGGER trg_set_order_cost_center
  BEFORE INSERT ON public.sicoob_orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_order_cost_center();

-- O rateio precisa somar 100% do pedido quando informado.
CREATE OR REPLACE FUNCTION public.tg_validate_order_allocations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_total NUMERIC(14,2);
  v_soma NUMERIC(14,2);
  v_perc NUMERIC(5,2);
BEGIN
  v_order_id := COALESCE(NEW.order_id, OLD.order_id);

  SELECT COALESCE(total_amount, 0) INTO v_total FROM public.sicoob_orders WHERE id = v_order_id;
  SELECT COALESCE(sum(valor), 0), COALESCE(sum(percentual), 0)
    INTO v_soma, v_perc
    FROM public.pa_budget_allocations WHERE order_id = v_order_id;

  -- Rascunho pode ter rateio incompleto; a consistência é exigida no commit.
  IF (SELECT status FROM public.sicoob_orders WHERE id = v_order_id)
     IN ('rascunho', 'draft', 'waiting_approval') THEN
    RETURN NULL;
  END IF;

  IF v_soma <> 0 AND abs(v_soma - v_total) > 0.01 THEN
    RAISE EXCEPTION 'Rateio do pedido % soma %, mas o pedido vale %.', v_order_id, v_soma, v_total;
  END IF;
  IF v_soma <> 0 AND abs(v_perc - 100) > 0.01 THEN
    RAISE EXCEPTION 'Rateio do pedido % esta em % por cento; precisa fechar em 100.', v_order_id, v_perc;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_order_allocations ON public.pa_budget_allocations;
CREATE TRIGGER trg_validate_order_allocations
  AFTER INSERT OR UPDATE OR DELETE ON public.pa_budget_allocations
  FOR EACH ROW EXECUTE FUNCTION public.tg_validate_order_allocations();

-- ============================================================================
-- 8. RPCs do ciclo de vida
-- ============================================================================
-- Todas resolvem a competência do pedido e recusam competência fechada.

CREATE OR REPLACE FUNCTION public.pa_budget_id_for_order(p_order_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pa_id UUID;
  v_created TIMESTAMPTZ;
  v_budget UUID;
BEGIN
  SELECT pa_id, created_at INTO v_pa_id, v_created
    FROM public.sicoob_orders WHERE id = p_order_id;

  IF v_pa_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_budget
    FROM public.pa_budgets
   WHERE pa_id = v_pa_id
     AND ano = EXTRACT(YEAR FROM v_created)::INT
     AND mes = EXTRACT(MONTH FROM v_created)::INT
   LIMIT 1;

  RETURN v_budget;
END;
$$;

-- Move o pedido no ciclo da verba. Idempotente: repetir o estado atual não
-- gera evento; transição lança o delta no livro (nenhum valor é reescrito).
CREATE OR REPLACE FUNCTION public.pa_budget_move_order(
  p_order_id UUID,
  p_para_estado TEXT,
  p_motivo TEXT DEFAULT NULL
)
RETURNS public.pa_budgets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_budget_id UUID;
  v_budget public.pa_budgets%ROWTYPE;
  v_total NUMERIC(14,2);
  v_cc UUID;
  v_atual TEXT;
  v_atual_valor NUMERIC(14,2);
  v_pendente NUMERIC(14,2);
BEGIN
  IF p_para_estado NOT IN ('reservado', 'comprometido', 'consumido', 'liberado') THEN
    RAISE EXCEPTION 'Estado de verba inválido: %', p_para_estado;
  END IF;

  v_budget_id := public.pa_budget_id_for_order(p_order_id);
  IF v_budget_id IS NULL THEN
    RAISE EXCEPTION 'Pedido % não possui verba configurada para a competência.', p_order_id;
  END IF;

  SELECT * INTO v_budget FROM public.pa_budgets WHERE id = v_budget_id;
  IF v_budget.fechada_em IS NOT NULL THEN
    RAISE EXCEPTION 'Competência %/% fechada; não é possível movimentar verba.',
      v_budget.mes, v_budget.ano;
  END IF;

  SELECT COALESCE(total_amount, 0), cost_center_id
    INTO v_total, v_cc
    FROM public.sicoob_orders WHERE id = p_order_id;

  -- Posição atual do pedido = soma dos eventos por estado.
  SELECT COALESCE(sum(valor), 0) INTO v_atual_valor
    FROM public.pa_budget_entries
   WHERE order_id = p_order_id AND pa_budget_id = v_budget_id;

  SELECT estado INTO v_atual
    FROM public.pa_budget_entries
   WHERE order_id = p_order_id AND pa_budget_id = v_budget_id
   ORDER BY created_at DESC, id DESC
   LIMIT 1;

  IF COALESCE(v_atual_valor, 0) = 0 THEN
    v_atual := NULL;
  END IF;

  -- Idempotência: já está no estado pedido, nada a lançar.
  IF v_atual IS NOT DISTINCT FROM NULLIF(p_para_estado, 'liberado') THEN
    RETURN v_budget;
  END IF;

  -- Só entrada em reserva/compromisso consome saldo livre.
  IF p_para_estado IN ('reservado', 'comprometido') THEN
    v_pendente := v_budget.verba_planejada
                  - v_budget.verba_reservada
                  - v_budget.verba_comprometida
                  - v_budget.verba_consumida;
    IF v_total - COALESCE(v_atual_valor, 0) > v_pendente THEN
      RAISE EXCEPTION
        'Saldo insuficiente na competência %/%: disponível %, solicitado %.',
        v_budget.mes, v_budget.ano, v_pendente, v_total;
    END IF;
  END IF;

  -- Fecha a posição anterior (devolve o que ela ocupava).
  IF v_atual IS NOT NULL AND COALESCE(v_atual_valor, 0) <> 0 THEN
    INSERT INTO public.pa_budget_entries
      (pa_budget_id, pa_id, competencia_ano, competencia_mes, cost_center_id,
       tipo, estado, valor, order_id, motivo, actor_id)
    VALUES (v_budget_id, v_budget.pa_id, v_budget.ano, v_budget.mes, v_cc,
            CASE WHEN v_atual = 'reservado' THEN 'liberacao'
                 WHEN v_atual = 'consumido' THEN 'estorno'
                 ELSE 'estorno' END,
            v_atual, -v_atual_valor, p_order_id,
            COALESCE(p_motivo, 'Transição de ' || v_atual || ' para ' || p_para_estado),
            auth.uid());
  END IF;

  -- Abre a nova posição.
  IF p_para_estado <> 'liberado' THEN
    INSERT INTO public.pa_budget_entries
      (pa_budget_id, pa_id, competencia_ano, competencia_mes, cost_center_id,
       tipo, estado, valor, order_id, motivo, actor_id)
    VALUES (v_budget_id, v_budget.pa_id, v_budget.ano, v_budget.mes, v_cc,
            CASE p_para_estado WHEN 'reservado' THEN 'reserva'
                               WHEN 'comprometido' THEN 'compromisso'
                               ELSE 'consumo' END,
            p_para_estado, v_total, p_order_id, p_motivo, auth.uid());
  END IF;

  SELECT * INTO v_budget FROM public.pa_budgets WHERE id = v_budget_id;
  RETURN v_budget;
END;
$$;

-- Fechar/reabrir competência (gestor de compras ou admin).
CREATE OR REPLACE FUNCTION public.pa_budget_close_competence(
  p_pa_id UUID,
  p_ano INT,
  p_mes INT,
  p_fechar BOOLEAN DEFAULT true
)
RETURNS public.pa_budgets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_budget public.pa_budgets%ROWTYPE;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.is_gestor_compras()) THEN
    RAISE EXCEPTION 'Apenas admin ou gestor de compras pode fechar competência.';
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
$$;

-- Conciliação: o agregado em pa_budgets precisa bater com o livro.
CREATE OR REPLACE FUNCTION public.pa_budget_reconcile(p_pa_id UUID, p_ano INT, p_mes INT)
RETURNS TABLE (
  pa_budget_id UUID,
  planejado NUMERIC,
  reservado_agregado NUMERIC,
  reservado_livro NUMERIC,
  comprometido_agregado NUMERIC,
  comprometido_livro NUMERIC,
  consumido_agregado NUMERIC,
  consumido_livro NUMERIC,
  divergente BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT b.id,
         b.verba_planejada,
         b.verba_reservada,
         COALESCE((SELECT sum(e.valor) FROM public.pa_budget_entries e
                    WHERE e.pa_budget_id = b.id AND e.estado = 'reservado'), 0),
         b.verba_comprometida,
         COALESCE((SELECT sum(e.valor) FROM public.pa_budget_entries e
                    WHERE e.pa_budget_id = b.id AND e.estado = 'comprometido'), 0),
         b.verba_consumida,
         COALESCE((SELECT sum(e.valor) FROM public.pa_budget_entries e
                    WHERE e.pa_budget_id = b.id AND e.estado = 'consumido'), 0),
         (b.verba_reservada <> COALESCE((SELECT sum(e.valor) FROM public.pa_budget_entries e
                                           WHERE e.pa_budget_id = b.id AND e.estado = 'reservado'), 0)
          OR b.verba_comprometida <> COALESCE((SELECT sum(e.valor) FROM public.pa_budget_entries e
                                                 WHERE e.pa_budget_id = b.id AND e.estado = 'comprometido'), 0)
          OR b.verba_consumida <> COALESCE((SELECT sum(e.valor) FROM public.pa_budget_entries e
                                              WHERE e.pa_budget_id = b.id AND e.estado = 'consumido'), 0))
    FROM public.pa_budgets b
   WHERE b.pa_id = p_pa_id AND b.ano = p_ano AND b.mes = p_mes;
END;
$$;

-- ============================================================================
-- 9. RLS e grants (fix 8: toda tabela nova nasce com policy explícita)
-- ============================================================================
ALTER TABLE public.cost_centers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pa_budget_entries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pa_budget_allocations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.cost_centers          FROM PUBLIC, anon;
REVOKE ALL ON public.pa_budget_entries     FROM PUBLIC, anon;
REVOKE ALL ON public.pa_budget_allocations FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE ON public.cost_centers          TO authenticated;
GRANT SELECT, INSERT         ON public.pa_budget_entries     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pa_budget_allocations TO authenticated;
GRANT ALL ON public.cost_centers, public.pa_budget_entries, public.pa_budget_allocations TO service_role;

DROP POLICY IF EXISTS cost_centers_select ON public.cost_centers;
CREATE POLICY cost_centers_select ON public.cost_centers
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.is_gestor_compras()
    OR cooperativa_id = public.current_user_cooperativa_id()
  );

DROP POLICY IF EXISTS cost_centers_write ON public.cost_centers;
CREATE POLICY cost_centers_write ON public.cost_centers
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.is_gestor_compras()
    OR cooperativa_id = public.current_user_cooperativa_id()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.is_gestor_compras()
    OR cooperativa_id = public.current_user_cooperativa_id()
  );

DROP POLICY IF EXISTS pa_budget_entries_select ON public.pa_budget_entries;
CREATE POLICY pa_budget_entries_select ON public.pa_budget_entries
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.is_gestor_compras()
    OR pa_id = public.current_user_pa_id()
  );

DROP POLICY IF EXISTS pa_budget_entries_insert ON public.pa_budget_entries;
CREATE POLICY pa_budget_entries_insert ON public.pa_budget_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.is_gestor_compras()
    OR pa_id = public.current_user_pa_id()
  );

DROP POLICY IF EXISTS pa_budget_allocations_select ON public.pa_budget_allocations;
CREATE POLICY pa_budget_allocations_select ON public.pa_budget_allocations
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.is_gestor_compras()
    OR EXISTS (
      SELECT 1 FROM public.sicoob_orders o
       WHERE o.id = pa_budget_allocations.order_id
         AND o.pa_id = public.current_user_pa_id()
    )
  );

DROP POLICY IF EXISTS pa_budget_allocations_write ON public.pa_budget_allocations;
CREATE POLICY pa_budget_allocations_write ON public.pa_budget_allocations
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.is_gestor_compras()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.is_gestor_compras()
  );

REVOKE ALL ON FUNCTION public.pa_budget_move_order(UUID, TEXT, TEXT)       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pa_budget_close_competence(UUID, INT, INT, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pa_budget_reconcile(UUID, INT, INT)          FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pa_budget_id_for_order(UUID)                 FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.pa_budget_move_order(UUID, TEXT, TEXT)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.pa_budget_close_competence(UUID, INT, INT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pa_budget_reconcile(UUID, INT, INT)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.pa_budget_id_for_order(UUID)                 TO authenticated;

-- ============================================================================
-- 10. Trigger legado passa a registrar no livro
-- ============================================================================
-- O trigger antigo somava verba_consumida direto quando o pedido virava
-- `confirmed`, o que impedia estorno e contava o pedido inteiro. Agora ele
-- delega a posição ao livro, mantendo as validações de alçada.
CREATE OR REPLACE FUNCTION public.check_order_constraints_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limite_alcada NUMERIC;
  v_budget public.pa_budgets%ROWTYPE;
BEGIN
  IF NEW.pa_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_budget
    FROM public.pa_budgets
   WHERE pa_id = NEW.pa_id
     AND ano = EXTRACT(YEAR FROM COALESCE(NEW.created_at, now()))::INT
     AND mes = EXTRACT(MONTH FROM COALESCE(NEW.created_at, now()))::INT
   LIMIT 1;

  IF NOT FOUND THEN
    IF NEW.status IN ('confirmed', 'waiting_approval') THEN
      RAISE EXCEPTION 'Orçamento não configurado para o PA % neste período.', NEW.pa_id;
    END IF;
    RETURN NEW;
  END IF;

  v_limite_alcada := v_budget.limite_alcada;

  IF NEW.status = 'confirmed'
     AND v_limite_alcada IS NOT NULL
     AND NEW.total_amount > v_limite_alcada
     AND NEW.approved_by IS NULL THEN
    RAISE EXCEPTION 'Este pedido excede a alçada de % e requer aprovação formal.', v_limite_alcada;
  END IF;

  -- Posição do pedido no livro, derivada do status.
  IF NEW.status = 'waiting_approval' THEN
    PERFORM public.pa_budget_move_order(NEW.id, 'reservado', 'Pedido aguardando aprovação');
  ELSIF NEW.status = 'confirmed' THEN
    PERFORM public.pa_budget_move_order(NEW.id, 'comprometido', 'Pedido confirmado');
  ELSIF NEW.status = 'delivered' OR NEW.status = 'completed' THEN
    PERFORM public.pa_budget_move_order(NEW.id, 'consumido', 'Pedido entregue');
  ELSIF NEW.status = 'draft' THEN
    PERFORM public.pa_budget_move_order(NEW.id, 'liberado', 'Pedido voltou para rascunho');
  END IF;

  RETURN NEW;
END;
$$;
