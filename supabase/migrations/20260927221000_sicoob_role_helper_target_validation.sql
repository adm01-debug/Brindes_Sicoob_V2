-- Helpers de autorização e RPCs de negócio validam papéis de usuários alvo.
-- A atividade precisa ser verificada para o alvo informado; limitar ao
-- auth.uid() quebraria, por exemplo, a validação do vendedor pelo gestor.

CREATE OR REPLACE FUNCTION public.sicoob_actor_is_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT _user_id IS NOT NULL
    AND EXISTS (
      SELECT 1
        FROM public.profiles p
       WHERE (p.user_id = _user_id OR p.id = _user_id)
         AND p.is_active IS TRUE
         AND p.deleted_at IS NULL
    );
$$;

REVOKE ALL ON FUNCTION public.sicoob_actor_is_active(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sicoob_actor_is_active(uuid) TO authenticated;

COMMENT ON FUNCTION public.sicoob_actor_is_active(uuid) IS
'Confirma vínculo ativo do usuário alvo; usado por helpers de papel próprios e por RPCs autorizadas que validam terceiros.';
