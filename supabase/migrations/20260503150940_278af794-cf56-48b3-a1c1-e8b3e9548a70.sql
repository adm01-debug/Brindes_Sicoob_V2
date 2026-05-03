-- Add new roles to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'comprador_pac';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'comprador_singular';

-- Add approval columns to quotes
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_notes TEXT,
ADD COLUMN IF NOT EXISTS pa_id UUID REFERENCES public.postos_atendimento(id),
ADD COLUMN IF NOT EXISTS singular_id UUID REFERENCES public.cooperativas(id);

-- Create a view or function to check hierarchy
CREATE OR REPLACE FUNCTION public.is_singular_buyer_for_quote(user_id UUID, quote_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_singular_id UUID;
    quote_singular_id UUID;
    user_role public.app_role;
BEGIN
    -- Get user singular_id and role
    SELECT cooperativa_id, role::public.app_role INTO user_singular_id, user_role 
    FROM public.profiles 
    WHERE profiles.user_id = $1;

    -- Get quote singular_id
    SELECT singular_id INTO quote_singular_id 
    FROM public.quotes 
    WHERE id = $2;

    RETURN (user_role = 'comprador_singular' OR user_role = 'admin') AND user_singular_id = quote_singular_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS for quotes to allow Singular Buyers to see quotes from their PACs
-- Current policies are quite broad, let's add specific ones for the approval flow.

CREATE POLICY "Singular Buyers can view quotes from their PACs" 
ON public.quotes 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = auth.uid() 
        AND p.role IN ('comprador_singular', 'gestor_compras')
        AND p.cooperativa_id = quotes.singular_id
    )
);

CREATE POLICY "Singular Buyers can approve quotes" 
ON public.quotes 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = auth.uid() 
        AND p.role IN ('comprador_singular', 'gestor_compras')
        AND p.cooperativa_id = quotes.singular_id
    )
)
WITH CHECK (
    -- Ensure they can only change status to approved or rejected
    (status IN ('approved_singular', 'rejected_singular'))
);

-- Trigger to automatically set singular_id on quote creation based on seller's PA
CREATE OR REPLACE FUNCTION public.set_quote_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
    SELECT pa_id, cooperativa_id INTO NEW.pa_id, NEW.singular_id
    FROM public.profiles
    WHERE user_id = NEW.seller_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_set_quote_hierarchy
BEFORE INSERT ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.set_quote_hierarchy();
