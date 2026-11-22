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
-- 1b. Escopo institucional das tabelas novas
-- ============================================================================
-- is_gestor_compras() sozinho apenas prova o papel; não prova vínculo com a
-- cooperativa/PA. Os helpers abaixo exigem vínculo real (perfil ativo) ou
-- privilégio administrativo.

CREATE OR REPLACE FUNCTION public.user_can_access_cooperativa(p_cooperativa_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p_cooperativa_id IS NOT NULL AND (
    public.is_admin((SELECT auth.uid()))
    OR p_cooperativa_id = public.current_user_cooperativa_id()
    OR EXISTS (
      SELECT 1
        FROM public.postos_atendimento AS service_point
       WHERE service_point.cooperativa_id = p_cooperativa_id
         AND service_point.is_active IS TRUE
         AND service_point.id = public.current_user_pa_id()
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_pa(p_pa_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p_pa_id IS NOT NULL AND (
    public.is_admin((SELECT auth.uid()))
    OR p_pa_id = public.current_user_pa_id()
    OR EXISTS (
      SELECT 1
        FROM public.postos_atendimento AS service_point
       WHERE service_point.id = p_pa_id
         AND service_point.is_active IS TRUE
         AND service_point.cooperativa_id = public.current_user_cooperativa_id()
    )
  );
$$;

REVOKE ALL ON FUNCTION public.user_can_access_cooperativa(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_can_access_pa(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_can_access_cooperativa(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_access_pa(UUID) TO authenticated, service_role;

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

  -- Chamadas de usuário só resolvem a verba de pedido que ele pode ler.
  IF (SELECT auth.uid()) IS NOT NULL
     AND NOT public.sicoob_current_actor_can_read_order(p_order_id) THEN
    RAISE EXCEPTION 'Sem permissao para consultar a verba do pedido %.', p_order_id;
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

-- Núcleo do ciclo: recebe o total já resolvido (o trigger BEFORE UPDATE vê o
-- valor antigo, por isso o total e o centro vêm por parâmetro).
-- Idempotente por (estado, valor): repetir a posição atual não gera evento.
CREATE OR REPLACE FUNCTION public.pa_budget_apply_state(
  p_order_id UUID,
  p_total NUMERIC,
  p_cost_center_id UUID,
  p_para_estado TEXT,
  p_motivo TEXT DEFAULT NULL,
  p_pa_id UUID DEFAULT NULL,
  p_created_at TIMESTAMPTZ DEFAULT NULL
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
  v_pa_id UUID;
  v_created TIMESTAMPTZ;
  v_atual TEXT;
  v_atual_valor NUMERIC(14,2);
  v_pendente NUMERIC(14,2);
BEGIN
  IF p_para_estado NOT IN ('reservado', 'comprometido', 'consumido', 'liberado') THEN
    RAISE EXCEPTION 'Estado de verba inválido: %', p_para_estado;
  END IF;

  v_pa_id := p_pa_id;
  v_created := p_created_at;

  IF v_pa_id IS NULL OR v_created IS NULL THEN
    SELECT pa_id, created_at INTO v_pa_id, v_created
      FROM public.sicoob_orders WHERE id = p_order_id;
  END IF;

  IF v_pa_id IS NULL OR v_created IS NULL THEN
    RAISE EXCEPTION 'Pedido % inexistente ou sem PA.', p_order_id;
  END IF;

  SELECT id INTO v_budget_id
    FROM public.pa_budgets
   WHERE pa_id = v_pa_id
     AND ano = EXTRACT(YEAR FROM v_created)::INT
     AND mes = EXTRACT(MONTH FROM v_created)::INT
   LIMIT 1;
  IF v_budget_id IS NULL THEN
    RAISE EXCEPTION 'Pedido % não possui verba configurada para a competência.', p_order_id;
  END IF;

  SELECT * INTO v_budget FROM public.pa_budgets WHERE id = v_budget_id FOR UPDATE;
  IF v_budget.fechada_em IS NOT NULL THEN
    RAISE EXCEPTION 'Competência %/% fechada; não é possível movimentar verba.',
      v_budget.mes, v_budget.ano;
  END IF;

  v_total := COALESCE(p_total, 0);
  v_cc := p_cost_center_id;

  -- Posição atual do pedido: estado do último evento + saldo líquido do livro.
  SELECT COALESCE(sum(valor), 0) INTO v_atual_valor
    FROM public.pa_budget_entries
   WHERE order_id = p_order_id AND pa_budget_id = v_budget_id;

  SELECT estado INTO v_atual
    FROM public.pa_budget_entries
   WHERE order_id = p_order_id AND pa_budget_id = v_budget_id
   ORDER BY created_at DESC, id DESC
   LIMIT 1;

  -- Livro líquido zerado significa pedido fora do ciclo.
  IF COALESCE(v_atual_valor, 0) = 0 THEN
    v_atual := NULL;
  END IF;

  -- Idempotência: mesma posição e mesmo valor não gera evento.
  IF v_atual IS NOT DISTINCT FROM NULLIF(p_para_estado, 'liberado')
     AND COALESCE(v_atual_valor, 0) = (CASE WHEN p_para_estado = 'liberado' THEN 0 ELSE v_total END) THEN
    RETURN v_budget;
  END IF;

  -- Entrar no ciclo (ou consumir direto) exige saldo livre na competência.
  -- A posição atual é liberada no mesmo movimento, então ela volta ao saldo.
  IF p_para_estado <> 'liberado' THEN
    v_pendente := v_budget.verba_planejada
                  - v_budget.verba_reservada
                  - v_budget.verba_comprometida
                  - v_budget.verba_consumida
                  + COALESCE(v_atual_valor, 0);
    IF v_total > v_pendente THEN
      RAISE EXCEPTION
        'Saldo insuficiente na competência %/%: disponível %, solicitado %.',
        v_budget.mes, v_budget.ano, v_pendente, v_total;
    END IF;
  END IF;

  -- Fecha a posição anterior devolvendo exatamente o que ela ocupava.
  IF v_atual IS NOT NULL AND COALESCE(v_atual_valor, 0) <> 0 THEN
    INSERT INTO public.pa_budget_entries
      (pa_budget_id, pa_id, competencia_ano, competencia_mes, cost_center_id,
       tipo, estado, valor, order_id, motivo, actor_id)
    VALUES (v_budget_id, v_budget.pa_id, v_budget.ano, v_budget.mes, v_cc,
            CASE WHEN v_atual = 'reservado' THEN 'liberacao' ELSE 'estorno' END,
            v_atual, -v_atual_valor, p_order_id,
            COALESCE(p_motivo, 'Transição de ' || v_atual || ' para ' || p_para_estado),
            (SELECT auth.uid()));
  END IF;

  -- Abre a nova posição.
  IF p_para_estado <> 'liberado' AND v_total <> 0 THEN
    INSERT INTO public.pa_budget_entries
      (pa_budget_id, pa_id, competencia_ano, competencia_mes, cost_center_id,
       tipo, estado, valor, order_id, motivo, actor_id)
    VALUES (v_budget_id, v_budget.pa_id, v_budget.ano, v_budget.mes, v_cc,
            CASE p_para_estado WHEN 'reservado' THEN 'reserva'
                               WHEN 'comprometido' THEN 'compromisso'
                               ELSE 'consumo' END,
            p_para_estado, v_total, p_order_id, p_motivo, (SELECT auth.uid()));
  END IF;

  SELECT * INTO v_budget FROM public.pa_budgets WHERE id = v_budget_id;
  RETURN v_budget;
END;
$$;

REVOKE ALL ON FUNCTION public.pa_budget_apply_state(UUID, NUMERIC, UUID, TEXT, TEXT, UUID, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pa_budget_apply_state(UUID, NUMERIC, UUID, TEXT, TEXT, UUID, TIMESTAMPTZ)
  TO service_role;

-- Wrapper de aplicação: resolve o total atual do pedido e exige escopo de
-- leitura do pedido quando chamado por um usuário autenticado.
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
  v_total NUMERIC(14,2);
  v_cc UUID;
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL
     AND NOT public.sicoob_current_actor_can_read_order(p_order_id) THEN
    RAISE EXCEPTION 'Sem permissao para movimentar a verba do pedido %.', p_order_id;
  END IF;

  SELECT COALESCE(total_amount, 0), cost_center_id
    INTO v_total, v_cc
    FROM public.sicoob_orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido % inexistente.', p_order_id;
  END IF;

  RETURN public.pa_budget_apply_state(p_order_id, v_total, v_cc, p_para_estado, p_motivo);
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
  IF NOT public.user_can_access_pa(p_pa_id) THEN
    RAISE EXCEPTION 'Sem permissao para conciliar a verba do PA %.', p_pa_id;
  END IF;

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
  USING (public.user_can_access_cooperativa(cooperativa_id));

DROP POLICY IF EXISTS cost_centers_write ON public.cost_centers;
CREATE POLICY cost_centers_write ON public.cost_centers
  FOR ALL TO authenticated
  USING (
    public.is_admin((SELECT auth.uid()))
    OR (public.is_gestor_compras() AND public.user_can_access_cooperativa(cooperativa_id))
  )
  WITH CHECK (
    public.is_admin((SELECT auth.uid()))
    OR (public.is_gestor_compras() AND public.user_can_access_cooperativa(cooperativa_id))
  );

DROP POLICY IF EXISTS pa_budget_entries_select ON public.pa_budget_entries;
CREATE POLICY pa_budget_entries_select ON public.pa_budget_entries
  FOR SELECT TO authenticated
  USING (public.user_can_access_pa(pa_id));

DROP POLICY IF EXISTS pa_budget_entries_insert ON public.pa_budget_entries;
CREATE POLICY pa_budget_entries_insert ON public.pa_budget_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_can_access_pa(pa_id)
    AND (
      public.is_admin((SELECT auth.uid()))
      OR public.is_gestor_compras()
    )
    AND actor_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS pa_budget_allocations_select ON public.pa_budget_allocations;
CREATE POLICY pa_budget_allocations_select ON public.pa_budget_allocations
  FOR SELECT TO authenticated
  USING (public.sicoob_current_actor_can_read_order(order_id));

DROP POLICY IF EXISTS pa_budget_allocations_write ON public.pa_budget_allocations;
CREATE POLICY pa_budget_allocations_write ON public.pa_budget_allocations
  FOR ALL TO authenticated
  USING (public.sicoob_current_actor_can_read_order(order_id))
  WITH CHECK (
    public.sicoob_current_actor_can_read_order(order_id)
    AND (
      cost_center_id IS NULL
      OR EXISTS (
        SELECT 1
          FROM public.cost_centers AS center
          JOIN public.sicoob_orders AS ord ON ord.id = pa_budget_allocations.order_id
          JOIN public.postos_atendimento AS service_point ON service_point.id = ord.pa_id
         WHERE center.id = pa_budget_allocations.cost_center_id
           AND center.cooperativa_id = service_point.cooperativa_id
      )
    )
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
-- 10. Backfill do consumo legado + trigger vivo do ciclo
-- ============================================================================
-- O consumo histórico vivia só no agregado `pa_budgets.verba_consumida`. Sem
-- backfill o primeiro recálculo zeraria o histórico (o livro nasce vazio).
INSERT INTO public.pa_budget_entries
  (pa_budget_id, pa_id, competencia_ano, competencia_mes, cost_center_id,
   tipo, estado, valor, order_id, motivo, actor_id)
SELECT b.id, b.pa_id, b.ano, b.mes, b.cost_center_id,
       'ajuste', 'consumido', b.verba_consumida, NULL,
       'Saldo de consumo legado anterior ao livro de verba', NULL
  FROM public.pa_budgets b
 WHERE b.verba_consumida > 0
   AND NOT EXISTS (
     SELECT 1 FROM public.pa_budget_entries e WHERE e.pa_budget_id = b.id
   );

-- Converte status do pedido no estado da verba. `NULL` = fora do ciclo.
CREATE OR REPLACE FUNCTION public.pa_budget_estado_do_status(p_status TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_status IN ('waiting_approval', 'escalated_to_board') THEN 'reservado'
    WHEN p_status IN ('confirmed', 'logistic', 'in_production',
                      'in_separation', 'in_transit') THEN 'comprometido'
    WHEN p_status IN ('delivered', 'completed') THEN 'consumido'
    ELSE 'liberado'
  END;
$$;

REVOKE ALL ON FUNCTION public.pa_budget_estado_do_status(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pa_budget_estado_do_status(TEXT) TO authenticated, service_role;

-- O trigger vivo em `sicoob_orders` é `trg_validate_sicoob_order_budget`
-- (migration 20260911143000). Substituímos a função dele: antes somava
-- `verba_consumida` direto; agora delega a posição ao livro de quatro estados,
-- preservando as validações de período/alçada.
CREATE OR REPLACE FUNCTION public.validate_sicoob_order_budget()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_estado TEXT;
  v_new_estado TEXT;
  v_budget public.pa_budgets%ROWTYPE;
  v_period_changed BOOLEAN;
  v_total_changed BOOLEAN;
BEGIN
  v_old_estado := public.pa_budget_estado_do_status(OLD.status);
  v_new_estado := public.pa_budget_estado_do_status(NEW.status);
  v_period_changed := NEW.pa_id IS DISTINCT FROM OLD.pa_id
                      OR NEW.created_at IS DISTINCT FROM OLD.created_at;
  v_total_changed  := NEW.total_amount IS DISTINCT FROM OLD.total_amount;

  -- Pedido já entregue/consumido não pode ter escopo financeiro reescrito.
  IF v_old_estado = 'consumido' AND (v_period_changed OR v_total_changed) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Pedido com verba consumida não permite alterar PA, valor ou período.';
  END IF;

  -- Entrar no ciclo exige PA e valor.
  IF v_new_estado <> 'liberado'
     AND (NEW.pa_id IS NULL OR COALESCE(NEW.total_amount, 0) <= 0) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Pedido confirmado exige PA e valor total positivo.';
  END IF;

  -- Mudou o PA/período estando no ciclo: libera a competência antiga antes.
  IF v_period_changed AND v_old_estado <> 'liberado' THEN
    PERFORM public.pa_budget_apply_state(
      NEW.id, OLD.total_amount, OLD.cost_center_id, 'liberado',
      'Pedido trocou de PA ou competência', OLD.pa_id, OLD.created_at);
  END IF;

  IF v_new_estado <> 'liberado' THEN
    SELECT * INTO v_budget
      FROM public.pa_budgets
     WHERE pa_id = NEW.pa_id
       AND ano = EXTRACT(YEAR FROM NEW.created_at)::integer
       AND mes = EXTRACT(MONTH FROM NEW.created_at)::integer
     LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'Orçamento não configurado para o PA no período do pedido.';
    END IF;

    -- Mudar o total com rateio já fechado exigiria reescrever o rateio na
    -- mesma instrução; por isso a revalidação vem ANTES de mover a posição.
    PERFORM public.pa_budget_validate_allocations(
      NEW.id, NEW.total_amount, NEW.status, true);

    PERFORM public.pa_budget_apply_state(
      NEW.id, NEW.total_amount, NEW.cost_center_id, v_new_estado,
      'Status do pedido: ' || NEW.status,
      NEW.pa_id, NEW.created_at);

    SELECT * INTO v_budget FROM public.pa_budgets WHERE id = v_budget.id;

    NEW.audit_remaining_budget := COALESCE(v_budget.verba_total, 0)
      - COALESCE(v_budget.verba_reservada, 0)
      - COALESCE(v_budget.verba_comprometida, 0)
      - COALESCE(v_budget.verba_consumida, 0);
  ELSIF v_old_estado <> 'liberado' THEN
    PERFORM public.pa_budget_apply_state(
      NEW.id, OLD.total_amount, OLD.cost_center_id, 'liberado',
      'Status do pedido: ' || NEW.status, OLD.pa_id, OLD.created_at);
  ELSIF v_period_changed OR v_total_changed THEN
    PERFORM public.pa_budget_validate_allocations(
      NEW.id, NEW.total_amount, NEW.status, true);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_sicoob_order_budget ON public.sicoob_orders;
CREATE TRIGGER trg_validate_sicoob_order_budget
BEFORE UPDATE OF status, pa_id, total_amount, created_at
ON public.sicoob_orders
FOR EACH ROW
EXECUTE FUNCTION public.validate_sicoob_order_budget();

-- ============================================================================
-- 10b. Reserva na criacao: o pedido ja nasce em `waiting_approval`
--
-- `BEFORE INSERT` nao serve aqui: a linha ainda nao existe e a FK de
-- `pa_budget_entries.order_id` falharia. A reserva roda depois do INSERT e o
-- proprio trigger devolve o saldo projetado na coluna de auditoria.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.tg_sicoob_order_budget_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_estado TEXT;
  v_budget public.pa_budgets%ROWTYPE;
BEGIN
  v_estado := public.pa_budget_estado_do_status(NEW.status);
  IF v_estado = 'liberado' THEN
    RETURN NULL;
  END IF;

  IF NEW.pa_id IS NULL OR COALESCE(NEW.total_amount, 0) <= 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Pedido confirmado exige PA e valor total positivo.';
  END IF;

  SELECT * INTO v_budget
    FROM public.pa_budgets
   WHERE pa_id = NEW.pa_id
     AND ano = EXTRACT(YEAR FROM NEW.created_at)::integer
     AND mes = EXTRACT(MONTH FROM NEW.created_at)::integer
   LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Orçamento não configurado para o PA no período do pedido.';
  END IF;

  PERFORM public.pa_budget_validate_allocations(
    NEW.id, NEW.total_amount, NEW.status, true);

  PERFORM public.pa_budget_apply_state(
    NEW.id, NEW.total_amount, NEW.cost_center_id, v_estado,
    'Status do pedido: ' || NEW.status,
    NEW.pa_id, NEW.created_at);

  SELECT * INTO v_budget FROM public.pa_budgets WHERE id = v_budget.id;

  UPDATE public.sicoob_orders
     SET audit_remaining_budget = COALESCE(v_budget.verba_total, 0)
       - COALESCE(v_budget.verba_reservada, 0)
       - COALESCE(v_budget.verba_comprometida, 0)
       - COALESCE(v_budget.verba_consumida, 0)
   WHERE id = NEW.id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_sicoob_order_budget_ins ON public.sicoob_orders;
CREATE TRIGGER trg_validate_sicoob_order_budget_ins
AFTER INSERT
ON public.sicoob_orders
FOR EACH ROW
EXECUTE FUNCTION public.tg_sicoob_order_budget_after_insert();

-- ============================================================================
-- 11. Rateio revalidado quando o total do pedido muda
-- ============================================================================
CREATE OR REPLACE FUNCTION public.pa_budget_validate_allocations(
  p_order_id UUID,
  p_total NUMERIC,
  p_status TEXT,
  p_estrito BOOLEAN DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_soma NUMERIC(14,2);
  v_perc NUMERIC(5,2);
BEGIN
  SELECT COALESCE(sum(valor), 0), COALESCE(sum(percentual), 0)
    INTO v_soma, v_perc
    FROM public.pa_budget_allocations WHERE order_id = p_order_id;

  IF COALESCE(v_soma, 0) = 0 THEN
    RETURN;
  END IF;

  -- O rateio e montado linha a linha enquanto o pedido esta em construcao;
  -- cada linha chega em uma transacao propria, entao exigir a soma fechada a
  -- cada INSERT travaria a propria tela de rateio. A soma de 100% e exigida
  -- quando o pedido entra ou muda de posicao na verba (`p_estrito`).
  IF NOT p_estrito
     AND p_status IN ('rascunho', 'draft', 'pending', 'waiting_approval',
                      'escalated_to_board', 'rejected', 'cancelled') THEN
    RETURN;
  END IF;

  IF abs(v_soma - COALESCE(p_total, 0)) > 0.01 THEN
    RAISE EXCEPTION 'Rateio do pedido % soma %, mas o pedido vale %.',
      p_order_id, v_soma, p_total;
  END IF;

  IF abs(v_perc - 100) > 0.01 THEN
    RAISE EXCEPTION 'Rateio do pedido % esta em % por cento; precisa fechar em 100.',
      p_order_id, v_perc;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.pa_budget_validate_allocations(UUID, NUMERIC, TEXT, BOOLEAN)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pa_budget_validate_allocations(UUID, NUMERIC, TEXT, BOOLEAN)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.tg_validate_order_allocations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_total NUMERIC(14,2);
  v_status TEXT;
BEGIN
  v_order_id := COALESCE(NEW.order_id, OLD.order_id);

  SELECT COALESCE(total_amount, 0), status
    INTO v_total, v_status
    FROM public.sicoob_orders WHERE id = v_order_id;

  PERFORM public.pa_budget_validate_allocations(v_order_id, v_total, v_status);
  RETURN NULL;
END;
$$;

-- A função legada não é mais reescrita aqui: o trigger que a chamava foi
-- removido pela migration 20260911143000. O ciclo vive em
-- `validate_sicoob_order_budget()` + `trg_validate_sicoob_order_budget`.
