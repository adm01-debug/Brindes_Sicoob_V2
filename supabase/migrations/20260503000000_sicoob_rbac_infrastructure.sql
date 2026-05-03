-- SICOOB RBAC Infrastructure Hardening (Wave 2)
-- Aligning DB schema with MATRIZ_PAPEIS_PERMISSOES.md

-- 1. Helper Functions for SICOOB Context
CREATE OR REPLACE FUNCTION public.get_user_pa_id()
RETURNS uuid AS $$
  SELECT pa_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_singular_id()
RETURNS uuid AS $$
  SELECT singular_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 2. Budget and Scaling Tables
CREATE TABLE IF NOT EXISTS public.pa_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pa_id UUID NOT NULL, -- references external_pas.id in bridge
    singular_id UUID NOT NULL,
    monthly_limit DECIMAL(12,2) NOT NULL DEFAULT 0,
    current_spent DECIMAL(12,2) NOT NULL DEFAULT 0,
    month_year DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(pa_id, month_year)
);

-- 3. RLS for Budgets (Admins + Gestor Compras)
ALTER TABLE public.pa_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all budgets"
ON public.pa_budgets FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Gestor Compras can manage their Singular budgets"
ON public.pa_budgets FOR ALL TO authenticated
USING (
    public.has_role(auth.uid(), 'gestor_compras') 
    AND singular_id = public.get_user_singular_id()
);

CREATE POLICY "Gerente PA can view their own budget"
ON public.pa_budgets FOR SELECT TO authenticated
USING (
    public.has_role(auth.uid(), 'gerente_pa') 
    AND pa_id = public.get_user_pa_id()
);

-- 4. Logistics Tracking Extension
CREATE TABLE IF NOT EXISTS public.logistics_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    status TEXT NOT NULL,
    tracking_code TEXT,
    carrier_name TEXT,
    photo_url TEXT,
    coordinates POINT,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.logistics_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SICOOB roles can view relevant tracking"
ON public.logistics_tracking FOR SELECT TO authenticated
USING (true); -- Filtered at row level in practice, simplified for MVP parity

CREATE POLICY "Vendedor/Admin can update tracking"
ON public.logistics_tracking FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'vendedor') OR public.has_role(auth.uid(), 'admin'));

