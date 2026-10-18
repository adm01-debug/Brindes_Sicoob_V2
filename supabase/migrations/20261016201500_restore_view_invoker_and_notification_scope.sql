-- Restaura invariantes que divergiram no banco canônico: views administrativas
-- devem respeitar RLS das tabelas-base e notificações diretas só podem ser
-- criadas para o próprio usuário autenticado.

DO $preflight$
DECLARE
  view_name text;
BEGIN
  FOREACH view_name IN ARRAY ARRAY[
    'sicoob_budget_audit',
    'telemetry_query_performance',
    'v_full_scope_grants',
    'v_sicoob_hierarchy'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_class relation
      JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname = 'public'
        AND relation.relname = view_name
        AND relation.relkind = 'v'
    ) THEN
      RAISE EXCEPTION 'View pública obrigatória ausente: public.%', view_name;
    END IF;
  END LOOP;
END
$preflight$;

ALTER VIEW public.sicoob_budget_audit SET (security_invoker = on);
ALTER VIEW public.telemetry_query_performance SET (security_invoker = on);
ALTER VIEW public.v_full_scope_grants SET (security_invoker = on);
ALTER VIEW public.v_sicoob_hierarchy SET (security_invoker = on);

REVOKE ALL ON
  public.sicoob_budget_audit,
  public.telemetry_query_performance,
  public.v_full_scope_grants,
  public.v_sicoob_hierarchy
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON
  public.sicoob_budget_audit,
  public.telemetry_query_performance,
  public.v_full_scope_grants,
  public.v_sicoob_hierarchy
TO authenticated, service_role;

DROP POLICY IF EXISTS authenticated_create_notifications ON public.notifications;
CREATE POLICY authenticated_create_notifications
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

DO $assert$
DECLARE
  view_name text;
  relation_oid oid;
BEGIN
  FOREACH view_name IN ARRAY ARRAY[
    'sicoob_budget_audit',
    'telemetry_query_performance',
    'v_full_scope_grants',
    'v_sicoob_hierarchy'
  ] LOOP
    SELECT relation.oid INTO relation_oid
    FROM pg_catalog.pg_class relation
    JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relname = view_name
      AND relation.relkind = 'v';

    IF NOT COALESCE((
      SELECT relation.reloptions @> ARRAY['security_invoker=on']::text[]
      FROM pg_catalog.pg_class relation
      WHERE relation.oid = relation_oid
    ), false) THEN
      RAISE EXCEPTION 'Contrato inválido: public.% não usa security_invoker.', view_name;
    END IF;

    IF has_table_privilege('anon', relation_oid, 'SELECT')
       OR has_table_privilege('authenticated', relation_oid, 'INSERT')
       OR has_table_privilege('authenticated', relation_oid, 'UPDATE')
       OR has_table_privilege('authenticated', relation_oid, 'DELETE')
       OR has_table_privilege('authenticated', relation_oid, 'TRUNCATE')
       OR has_table_privilege('authenticated', relation_oid, 'REFERENCES')
       OR has_table_privilege('authenticated', relation_oid, 'TRIGGER')
       OR NOT has_table_privilege('authenticated', relation_oid, 'SELECT')
       OR NOT has_table_privilege('service_role', relation_oid, 'SELECT') THEN
      RAISE EXCEPTION 'Contrato inválido: ACL excessiva ou leitura necessária ausente em public.%.', view_name;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy policy
    WHERE policy.polrelid = 'public.notifications'::regclass
      AND policy.polname = 'authenticated_create_notifications'
      AND policy.polcmd = 'a'
      AND policy.polroles = ARRAY['authenticated'::regrole::oid]
      AND pg_catalog.pg_get_expr(policy.polwithcheck, policy.polrelid) LIKE '%user_id%'
      AND pg_catalog.pg_get_expr(policy.polwithcheck, policy.polrelid) LIKE '%uid()%'
  ) THEN
    RAISE EXCEPTION 'Contrato inválido: INSERT de notifications não está limitado ao destinatário autenticado.';
  END IF;
END
$assert$;
