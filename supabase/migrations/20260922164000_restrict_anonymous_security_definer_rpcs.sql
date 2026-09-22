-- Default privileges deixaram funções SECURITY DEFINER executáveis por anon.
-- Mantém somente contratos que ainda sustentam policies com role public,
-- fluxos públicos por token ou a busca semântica explicitamente pública.
-- Os 13 helpers de policy preservados precisam de revisão separada das roles
-- das policies antes de seu acesso anônimo poder ser removido.

DO $acl$
DECLARE
  target regprocedure;
  anonymous_allowlist constant text[] := ARRAY[
    -- Helpers usados por policies atualmente declaradas para role public.
    'can_manage',
    'can_view_all_sales',
    'current_user_cooperativa_id',
    'current_user_pa_id',
    'get_user_cooperative_id',
    'get_user_org_ids',
    'get_user_pa_id',
    'has_role',
    'is_admin',
    'is_dev',
    'is_kit_collaborator',
    'is_kit_owner',
    'is_supervisor_or_above',
    -- Contratos por token; a autorização ocorre dentro da função.
    'consume_step_up_token',
    'get_quote_token_by_value',
    'log_full_scope_grant',
    'log_rls_denial',
    'record_public_token_failure',
    'submit_quote_response',
    -- Pesquisa de catálogo com GRANT anon explícito no contrato original.
    'search_products_semantic'
  ];
BEGIN
  FOR target IN
    SELECT p.oid::regprocedure
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prosecdef
       AND p.prorettype <> 'trigger'::regtype
       AND has_function_privilege('anon', p.oid, 'EXECUTE')
       AND NOT (p.proname = ANY (anonymous_allowlist))
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon',
      target
    );
  END LOOP;
END
$acl$;
