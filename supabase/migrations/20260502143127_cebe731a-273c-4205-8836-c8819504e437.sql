
-- ============================================================================
-- COOPERATIVAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cooperativas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  codigo      TEXT NOT NULL UNIQUE,
  cnpj        TEXT,
  cidade      TEXT,
  uf          TEXT CHECK (uf IS NULL OR length(uf) = 2),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cooperativas_active ON public.cooperativas(is_active) WHERE is_active = true;

-- ============================================================================
-- POSTOS DE ATENDIMENTO
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.postos_atendimento (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cooperativa_id        UUID NOT NULL REFERENCES public.cooperativas(id) ON DELETE RESTRICT,
  nome                  TEXT NOT NULL,
  codigo                TEXT NOT NULL,
  endereco              TEXT,
  cidade                TEXT,
  uf                    TEXT CHECK (uf IS NULL OR length(uf) = 2),
  responsavel_user_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cooperativa_id, codigo)
);
CREATE INDEX IF NOT EXISTS idx_pas_coop ON public.postos_atendimento(cooperativa_id);
CREATE INDEX IF NOT EXISTS idx_pas_responsavel ON public.postos_atendimento(responsavel_user_id);

-- ============================================================================
-- profiles: cooperativa_id, pa_id
-- ============================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cooperativa_id UUID REFERENCES public.cooperativas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pa_id          UUID REFERENCES public.postos_atendimento(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_cooperativa ON public.profiles(cooperativa_id);
CREATE INDEX IF NOT EXISTS idx_profiles_pa ON public.profiles(pa_id);

-- ============================================================================
-- VERBAS por Cooperativa
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cooperativa_budgets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cooperativa_id  UUID NOT NULL REFERENCES public.cooperativas(id) ON DELETE CASCADE,
  ano             INT NOT NULL CHECK (ano BETWEEN 2024 AND 2100),
  mes             INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  verba_total     NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (verba_total >= 0),
  limite_alcada   NUMERIC(14,2) CHECK (limite_alcada IS NULL OR limite_alcada >= 0),
  observacoes     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cooperativa_id, ano, mes)
);
CREATE INDEX IF NOT EXISTS idx_coop_budgets_period ON public.cooperativa_budgets(ano, mes);

-- ============================================================================
-- VERBAS por PA
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pa_budgets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pa_id            UUID NOT NULL REFERENCES public.postos_atendimento(id) ON DELETE CASCADE,
  ano              INT NOT NULL CHECK (ano BETWEEN 2024 AND 2100),
  mes              INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  verba_total      NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (verba_total >= 0),
  verba_consumida  NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (verba_consumida >= 0),
  limite_alcada    NUMERIC(14,2) CHECK (limite_alcada IS NULL OR limite_alcada >= 0),
  observacoes      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pa_id, ano, mes)
);
CREATE INDEX IF NOT EXISTS idx_pa_budgets_period ON public.pa_budgets(ano, mes);
CREATE INDEX IF NOT EXISTS idx_pa_budgets_pa ON public.pa_budgets(pa_id);

-- ============================================================================
-- Trigger updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_cooperativas_updated ON public.cooperativas;
CREATE TRIGGER trg_cooperativas_updated BEFORE UPDATE ON public.cooperativas
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS trg_pas_updated ON public.postos_atendimento;
CREATE TRIGGER trg_pas_updated BEFORE UPDATE ON public.postos_atendimento
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS trg_coop_budgets_updated ON public.cooperativa_budgets;
CREATE TRIGGER trg_coop_budgets_updated BEFORE UPDATE ON public.cooperativa_budgets
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS trg_pa_budgets_updated ON public.pa_budgets;
CREATE TRIGGER trg_pa_budgets_updated BEFORE UPDATE ON public.pa_budgets
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================================
-- HELPER FUNCTIONS — SECURITY DEFINER, ACL fechada
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_gestor_compras(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'gestor_compras');
$$;

CREATE OR REPLACE FUNCTION public.is_gerente_pa(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'gerente_pa');
$$;

CREATE OR REPLACE FUNCTION public.is_vendedor_role(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'vendedor');
$$;

CREATE OR REPLACE FUNCTION public.current_user_pa_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pa_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_cooperativa_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cooperativa_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.is_gestor_compras(UUID)        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_gerente_pa(UUID)            FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_vendedor_role(UUID)         FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.current_user_pa_id()           FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.current_user_cooperativa_id()  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_gestor_compras(UUID)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_gerente_pa(UUID)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_vendedor_role(UUID)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_pa_id()           TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_cooperativa_id()  TO authenticated;

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.cooperativas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.postos_atendimento   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooperativa_budgets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pa_budgets           ENABLE ROW LEVEL SECURITY;

-- Cooperativas
CREATE POLICY "cooperativas_anon_deny" ON public.cooperativas AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "cooperativas_select" ON public.cooperativas FOR SELECT TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "cooperativas_admin_insert" ON public.cooperativas FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "cooperativas_admin_update" ON public.cooperativas FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "cooperativas_admin_delete" ON public.cooperativas FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- PAs
CREATE POLICY "pas_anon_deny" ON public.postos_atendimento AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "pas_select" ON public.postos_atendimento FOR SELECT TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pas_admin_insert" ON public.postos_atendimento FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pas_admin_update" ON public.postos_atendimento FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pas_admin_delete" ON public.postos_atendimento FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Verbas Cooperativa
CREATE POLICY "coop_budgets_anon_deny" ON public.cooperativa_budgets AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "coop_budgets_select" ON public.cooperativa_budgets FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_gestor_compras() OR cooperativa_id = public.current_user_cooperativa_id());
CREATE POLICY "coop_budgets_insert" ON public.cooperativa_budgets FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_gestor_compras());
CREATE POLICY "coop_budgets_update" ON public.cooperativa_budgets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_gestor_compras())
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_gestor_compras());
CREATE POLICY "coop_budgets_delete" ON public.cooperativa_budgets FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Verbas PA
CREATE POLICY "pa_budgets_anon_deny" ON public.pa_budgets AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "pa_budgets_select" ON public.pa_budgets FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_gestor_compras() OR pa_id = public.current_user_pa_id());
CREATE POLICY "pa_budgets_insert" ON public.pa_budgets FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_gestor_compras());
CREATE POLICY "pa_budgets_update" ON public.pa_budgets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_gestor_compras())
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_gestor_compras());
CREATE POLICY "pa_budgets_delete" ON public.pa_budgets FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
