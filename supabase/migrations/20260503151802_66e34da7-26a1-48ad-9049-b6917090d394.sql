-- 1. Create order_status enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM (
      'rascunho', 
      'enviado_gestor', 
      'aprovado_gestor', 
      'enviado_vendedor', 
      'em_producao', 
      'em_separacao', 
      'em_transporte', 
      'entregue', 
      'concluido', 
      'cancelado'
    );
  END IF;
END $$;

-- 2. Create quote_consolidations table
CREATE TABLE IF NOT EXISTS public.quote_consolidations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consolidated_by UUID REFERENCES auth.users(id),
    singular_id UUID REFERENCES public.cooperativas(id),
    status TEXT DEFAULT 'pending', -- 'pending', 'converted', 'cancelled'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Link quotes to consolidation if needed
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS consolidation_id UUID REFERENCES public.quote_consolidations(id);

-- 3. Add approval threshold to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approval_threshold NUMERIC DEFAULT 5000;

-- 4. Enable RLS on quote_consolidations
ALTER TABLE public.quote_consolidations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Singular Buyers can manage their consolidations" 
ON public.quote_consolidations FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = auth.uid() 
        AND p.role IN ('gestor_compras', 'comprador_singular', 'admin', 'dev')
        AND p.cooperativa_id = quote_consolidations.singular_id
    )
);

-- 5. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER tr_quote_consolidations_updated_at
BEFORE UPDATE ON public.quote_consolidations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
