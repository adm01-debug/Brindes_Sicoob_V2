-- Adiciona as funções de favoritos públicos à lista revisada de ACL do
-- audit_security_definer_acl(). Estas funções recebem EXECUTE para anon
-- intencionalmente (acesso via token público) mas não estavam incluídas
-- na allowlist revisada, causando alertas falsos no CI de compliance.
--
-- Ponto de partida: migration 20261007220500_revoke_anon_security_helper_execute.sql
-- que deixou a lista com apenas get_sicoob_invitation(text).
-- Acrescentamos SOMENTE as duas assinaturas de favoritos públicos revisadas.

CREATE OR REPLACE FUNCTION public.audit_security_definer_acl()
RETURNS TABLE(function_name text, arguments text, problem text, granted_to text)
LANGUAGE sql
STABLE
SET search_path TO 'pg_catalog', 'public'
AS $function$
  WITH reviewed AS (
    SELECT to_regprocedure(signature)::oid AS oid
    FROM unnest(ARRAY[
      'public.get_sicoob_invitation(text)',
      'public.get_public_favorite_list(text)',
      'public.get_public_favorite_reactions(text,text)'
    ]) AS signatures(signature)
  ), defs AS (
    SELECT p.oid, p.proname::text AS name,
      pg_get_function_identity_arguments(p.oid) AS args,
      p.prorettype = 'pg_catalog.trigger'::regtype AS is_trigger,
      EXISTS (SELECT 1 FROM reviewed r WHERE r.oid = p.oid) AS anon_intent,
      EXISTS (
        SELECT 1 FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
        WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE'
      ) AS public_execute
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  )
  SELECT name, args, 'PUBLIC tem EXECUTE'::text, 'PUBLIC'::text
  FROM defs WHERE public_execute
  UNION ALL
  SELECT name, args, 'anon tem EXECUTE fora das assinaturas revisadas'::text, 'anon'::text
  FROM defs WHERE NOT anon_intent AND has_function_privilege('anon', oid, 'EXECUTE')
  UNION ALL
  SELECT name, args, 'authenticated tem EXECUTE em função de trigger'::text, 'authenticated'::text
  FROM defs WHERE is_trigger AND has_function_privilege('authenticated', oid, 'EXECUTE')
  ORDER BY 1, 2, 4;
$function$;

REVOKE EXECUTE ON FUNCTION public.audit_security_definer_acl() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.audit_security_definer_acl() TO authenticated, service_role;
COMMENT ON FUNCTION public.audit_security_definer_acl() IS
'Audita EXECUTE efetivo em SECURITY DEFINER; exceções anônimas revisadas: get_sicoob_invitation, get_public_favorite_list, get_public_favorite_reactions.';
