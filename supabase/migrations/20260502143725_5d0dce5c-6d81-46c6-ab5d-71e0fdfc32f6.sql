-- ============================================================================
-- 1. PROFILES RLS UPDATE
-- Allow Sicoob roles to manage profiles within their scope
-- ============================================================================

-- Gestor Compras can view profiles in the same Cooperativa
CREATE POLICY "Gestor Compras can view cooperative profiles" 
ON public.profiles FOR SELECT TO authenticated
USING (
  public.is_gestor_compras() 
  AND cooperativa_id = (SELECT p.cooperativa_id FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- Gerente PA can view profiles in the same PA
CREATE POLICY "Gerente PA can view PA profiles" 
ON public.profiles FOR SELECT TO authenticated
USING (
  public.is_gerente_pa() 
  AND pa_id = (SELECT p.pa_id FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- ============================================================================
-- 2. COOPERATIVAS RLS UPDATE
-- ============================================================================

-- Gestor Compras can update their own cooperativa
CREATE POLICY "cooperativas_gestor_update" ON public.cooperativas FOR UPDATE TO authenticated
USING (
  public.is_gestor_compras() 
  AND id = (SELECT p.cooperativa_id FROM public.profiles p WHERE p.user_id = auth.uid())
)
WITH CHECK (
  public.is_gestor_compras() 
  AND id = (SELECT p.cooperativa_id FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- ============================================================================
-- 3. POSTOS DE ATENDIMENTO RLS UPDATE
-- ============================================================================

-- Gestor Compras can manage PAs in their cooperativa
CREATE POLICY "pas_gestor_all" ON public.postos_atendimento FOR ALL TO authenticated
USING (
  public.is_gestor_compras() 
  AND cooperativa_id = (SELECT p.cooperativa_id FROM public.profiles p WHERE p.user_id = auth.uid())
)
WITH CHECK (
  public.is_gestor_compras() 
  AND cooperativa_id = (SELECT p.cooperativa_id FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- Gerente PA can update their own PA
CREATE POLICY "pas_gerente_update" ON public.postos_atendimento FOR UPDATE TO authenticated
USING (
  public.is_gerente_pa() 
  AND id = (SELECT p.pa_id FROM public.profiles p WHERE p.user_id = auth.uid())
)
WITH CHECK (
  public.is_gerente_pa() 
  AND id = (SELECT p.pa_id FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- ============================================================================
-- 4. VERBAS (BUDGETS) RLS REFINEMENT
-- Note: Existing policies in 20260502143127 already have some basic checks
-- We are reinforcing them here with explicit scope checks
-- ============================================================================

-- Ensure Gestor Compras only manages budgets of their cooperativa
DROP POLICY IF EXISTS "coop_budgets_update" ON public.cooperativa_budgets;
CREATE POLICY "coop_budgets_update_scoped" ON public.cooperativa_budgets FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') 
  OR (public.is_gestor_compras() AND cooperativa_id = (SELECT p.cooperativa_id FROM public.profiles p WHERE p.user_id = auth.uid()))
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') 
  OR (public.is_gestor_compras() AND cooperativa_id = (SELECT p.cooperativa_id FROM public.profiles p WHERE p.user_id = auth.uid()))
);

-- Ensure Gerente PA can update budgets of their own PA (alcada/observacoes)
CREATE POLICY "pa_budgets_gerente_update" ON public.pa_budgets FOR UPDATE TO authenticated
USING (
  public.is_gerente_pa() AND pa_id = (SELECT p.pa_id FROM public.profiles p WHERE p.user_id = auth.uid())
)
WITH CHECK (
  public.is_gerente_pa() AND pa_id = (SELECT p.pa_id FROM public.profiles p WHERE p.user_id = auth.uid())
);
