-- SICOOB Order Consolidation & Workflow (Wave 3)

-- Table for consolidated order groups (by Singular/Carteira)
CREATE TABLE IF NOT EXISTS public.order_consolidations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    singular_id UUID NOT NULL,
    vendedor_id UUID NOT NULL, -- The seller who will receive the consolidated order
    status TEXT NOT NULL DEFAULT 'draft', -- draft, pending_seller, in_production, sent
    total_value DECIMAL(12,2) NOT NULL DEFAULT 0,
    order_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    consolidated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.order_consolidations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and Gestores can view consolidations"
ON public.order_consolidations FOR SELECT TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    (public.has_role(auth.uid(), 'gestor_compras') AND singular_id = public.get_user_singular_id()) OR
    (public.has_role(auth.uid(), 'vendedor') AND vendedor_id = auth.uid())
);

-- 2. Logic to aggregate orders into a consolidation
CREATE OR REPLACE FUNCTION public.consolidate_pa_orders(_singular_id UUID, _vendedor_id UUID)
RETURNS UUID AS $$
DECLARE
    new_consolidation_id UUID;
BEGIN
    -- Create the group
    INSERT INTO public.order_consolidations (singular_id, vendedor_id, status, consolidated_by)
    VALUES (_singular_id, _vendedor_id, 'pending_seller', auth.uid())
    RETURNING id INTO new_consolidation_id;
    
    -- In a real scenario, we would update individual orders here to reference this consolidation
    -- UPDATE public.orders SET consolidation_id = new_consolidation_id ...
    
    RETURN new_consolidation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
