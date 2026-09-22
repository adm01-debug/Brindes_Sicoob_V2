-- Helpers chamados por policies precisam ser executáveis pela role da policy.
-- Todos estes helpers já limitam a identidade ao auth.uid() (ou não aceitam
-- identidade), portanto o grant não permite consultar permissões de terceiros.
REVOKE EXECUTE ON FUNCTION public.can_manage(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_pa_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_cooperative_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_singular_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_kit_owner(uuid,uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_kit_collaborator(uuid,uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.can_manage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_pa_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_cooperative_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_singular_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_kit_owner(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_kit_collaborator(uuid,uuid) TO authenticated;
