-- Limpeza de políticas obsoletas em postos_atendimento
DROP POLICY IF EXISTS "pas_anon_deny" ON public.postos_atendimento;
DROP POLICY IF EXISTS "pas_gerente_update" ON public.postos_atendimento;
DROP POLICY IF EXISTS "pas_gestor_all" ON public.postos_atendimento;

-- Limpeza de políticas obsoletas em cooperativas
DROP POLICY IF EXISTS "cooperativas_anon_deny" ON public.cooperativas;
DROP POLICY IF EXISTS "cooperativas_gestor_update" ON public.cooperativas;

-- Limpeza de políticas redundantes em sicoob_orders
DROP POLICY IF EXISTS "Vendedores can manage their PA orders" ON public.sicoob_orders;

-- Garantir que a política de visualização pública (is_active ou admin) cubra os casos necessários
-- Já existe a policy 'pas_select_v2' e 'cooperativas_select_v2' que usam is_admin(auth.uid())

-- Atualizar políticas de profiles para garantir clareza
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own or admin view all" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid() OR is_admin(auth.uid()));
