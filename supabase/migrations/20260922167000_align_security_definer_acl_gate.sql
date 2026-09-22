-- Nenhuma função SECURITY DEFINER deve herdar EXECUTE de PUBLIC. Os grants
-- anônimos necessários a policies/RPCs públicas permanecem sempre explícitos.
REVOKE EXECUTE ON FUNCTION public.can_manage(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_view_all_sales(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_user_cooperativa_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_user_pa_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_quote_token_by_value(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_cooperative_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_org_ids(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_pa_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_dev(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_kit_collaborator(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_kit_owner(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_supervisor_or_above(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_quote_response(text, text, text) FROM PUBLIC;

-- O gate diferencia as duas RPCs públicas por token dos helpers necessários a
-- policies com role public. Os helpers que recebem usuário foram protegidos
-- contra consulta de terceiros na migration 20260922165000.
CREATE OR REPLACE FUNCTION public.audit_security_definer_acl()
RETURNS TABLE(function_name text, arguments text, problem text, granted_to text)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  WITH defs AS (
    SELECT
      p.oid,
      p.proname,
      pg_get_function_identity_arguments(p.oid) AS args,
      p.proacl,
      (pg_get_function_result(p.oid) = 'trigger') AS is_trigger,
      (p.proname IN (
        'can_manage',
        'can_view_all_sales',
        'current_user_cooperativa_id',
        'current_user_pa_id',
        'get_quote_token_by_value',
        'get_user_cooperative_id',
        'get_user_org_ids',
        'get_user_pa_id',
        'has_role',
        'is_admin',
        'is_dev',
        'is_kit_collaborator',
        'is_kit_owner',
        'is_supervisor_or_above',
        'submit_quote_response'
      )) AS anon_intent
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  ),
  acl_expanded AS (
    SELECT
      d.proname,
      d.args,
      d.is_trigger,
      d.anon_intent,
      a.grantee::regrole::text AS grantee
    FROM defs d
    LEFT JOIN LATERAL (
      SELECT (aclexplode(d.proacl)).grantee
    ) a ON true
    WHERE a.grantee IS NOT NULL
  )
  SELECT proname, args, 'PUBLIC has EXECUTE'::text, 'PUBLIC'::text
  FROM acl_expanded
  WHERE grantee = '-'
  UNION ALL
  SELECT proname, args, 'anon has EXECUTE (not in reviewed allowlist)'::text, 'anon'
  FROM acl_expanded
  WHERE grantee = 'anon' AND NOT anon_intent
  UNION ALL
  SELECT proname, args, 'trigger function has EXECUTE for authenticated'::text, 'authenticated'
  FROM acl_expanded
  WHERE grantee = 'authenticated' AND is_trigger
  ORDER BY 1, 2;
$function$;

REVOKE EXECUTE ON FUNCTION public.audit_security_definer_acl() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.audit_security_definer_acl() TO authenticated, service_role;

COMMENT ON FUNCTION public.audit_security_definer_acl() IS
'Audita grants de funções SECURITY DEFINER; a allowlist anônima contém somente helpers de policies limitados ao ator e RPCs públicas por token revisadas.';
