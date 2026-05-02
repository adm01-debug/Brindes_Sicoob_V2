-- 1. Resolver ambiguidade da função is_admin removendo a versão sem parâmetros
DROP FUNCTION IF EXISTS public.is_admin();

-- 2. Remover políticas antigas que usam lógicas obsoletas (cooperativas e pas)
DROP POLICY IF EXISTS "cooperativas_admin_delete" ON public.cooperativas;
DROP POLICY IF EXISTS "cooperativas_admin_insert" ON public.cooperativas;
DROP POLICY IF EXISTS "cooperativas_admin_update" ON public.cooperativas;
DROP POLICY IF EXISTS "pas_admin_delete" ON public.postos_atendimento;
DROP POLICY IF EXISTS "pas_admin_insert" ON public.postos_atendimento;
DROP POLICY IF EXISTS "pas_admin_update" ON public.postos_atendimento;

-- 3. Criar novas políticas consolidadas para Admin nas tabelas base
CREATE POLICY "Admins have full access to cooperativas"
ON public.cooperativas
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins have full access to postos_atendimento"
ON public.postos_atendimento
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

-- 4. Atualizar política de Admin em sicoob_orders para consistência
DROP POLICY IF EXISTS "Admins have full access to sicoob_orders" ON public.sicoob_orders;
CREATE POLICY "Admins have full access to sicoob_orders"
ON public.sicoob_orders
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

-- 5. Atualizar políticas de SELECT para usar a lógica unificada
DROP POLICY IF EXISTS "cooperativas_select" ON public.cooperativas;
CREATE POLICY "cooperativas_select_v2"
ON public.cooperativas
FOR SELECT
TO authenticated
USING (is_active = true OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "pas_select" ON public.postos_atendimento;
CREATE POLICY "pas_select_v2"
ON public.postos_atendimento
FOR SELECT
TO authenticated
USING (is_active = true OR is_admin(auth.uid()));
