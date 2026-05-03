-- Add hierarchy columns to profiles for SICOOB RBAC
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pa_id UUID,
ADD COLUMN IF NOT EXISTS singular_id UUID,
ADD COLUMN IF NOT EXISTS carteira_id UUID;

-- Comments for documentation
COMMENT ON COLUMN public.profiles.pa_id IS 'ID do Ponto de Atendimento (PA) do usuário SICOOB';
COMMENT ON COLUMN public.profiles.singular_id IS 'ID da Cooperativa Singular do usuário SICOOB';
COMMENT ON COLUMN public.profiles.carteira_id IS 'ID da Carteira de Atendimento (Vendedor) SICOOB';

-- Update search path helper for RLS
CREATE OR REPLACE FUNCTION public.get_user_singular_id()
RETURNS uuid AS $$
  SELECT singular_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.pa_belongs_to_user_singular(_pa_id UUID)
RETURNS boolean AS $$
  -- Checks if a given PA belongs to the same singular as the logged user
  -- Placeholder for logic that would check external_pas table in bridge
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND singular_id IS NOT NULL
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
