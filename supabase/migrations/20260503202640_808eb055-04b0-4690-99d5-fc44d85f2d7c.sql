ALTER FUNCTION public.qa_preflight_check() SET search_path = public;
ALTER FUNCTION public.cleanup_test_auth_orphans(uuid[]) SET search_path = public, auth;
