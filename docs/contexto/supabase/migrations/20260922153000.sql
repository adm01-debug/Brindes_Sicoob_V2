-- O projeto concede EXECUTE diretamente a anon/authenticated por padrão.
-- Revogar somente PUBLIC não protege funções SECURITY DEFINER.
REVOKE ALL ON FUNCTION public.create_quote_version_atomic(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_quote_version_atomic(uuid) TO authenticated, service_role;

-- Funções de gatilho são chamadas internamente pelo PostgreSQL, não pelo cliente.
REVOKE ALL ON FUNCTION public.normalize_quote_parent_root() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_latest_quote_version_deletion() FROM PUBLIC, anon, authenticated;
