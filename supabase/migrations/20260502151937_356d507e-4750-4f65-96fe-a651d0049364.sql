-- Atualizando políticas de cooperativas para incluir gestor_compras
-- Verificamos que o teste falhou por falta dessa referência explícita nas políticas
DO $$
BEGIN
    -- Remover políticas antigas para evitar conflitos se necessário
    -- Mas aqui vamos apenas adicionar/ajustar a política de leitura/update para gestores
    
    DROP POLICY IF EXISTS "Gestores can update their own cooperative" ON public.cooperativas;
    CREATE POLICY "Gestores can update their own cooperative"
    ON public.cooperativas
    FOR UPDATE
    USING (public.has_role(auth.uid(), 'gestor_compras') AND id = public.current_user_cooperativa_id());

    DROP POLICY IF EXISTS "Gestores can view their own cooperative" ON public.cooperativas;
    CREATE POLICY "Gestores can view their own cooperative"
    ON public.cooperativas
    FOR SELECT
    USING (public.has_role(auth.uid(), 'gestor_compras') AND id = public.current_user_cooperativa_id());
END
$$;

-- Garantir que as políticas de profiles e user_roles atendam aos critérios do teste de segurança global
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage user_roles" ON public.user_roles;
CREATE POLICY "Admins can manage user_roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));
