-- SOMENTE LEITURA. Preparado para o projeto cfmzkthhgliqelozlmwu.
-- Ainda não executado nesta rodada; não é uma migration.
-- Retorna metadados e totais, nunca linhas de clientes, senhas ou tokens.
BEGIN READ ONLY;
SELECT jsonb_build_object(
  'capturado_em', now(),
  'banco', current_database(),
  'migrations', (
    SELECT jsonb_agg(jsonb_build_object(
      'version', version, 'name', name,
      'statements_count', cardinality(statements),
      'statements_md5', md5(array_to_string(statements, E'\n'))
    ) ORDER BY version) FROM supabase_migrations.schema_migrations
  ),
  'relations', (
    SELECT jsonb_agg(jsonb_build_object(
      'name', c.relname, 'kind', c.relkind,
      'rls', c.relrowsecurity, 'force_rls', c.relforcerowsecurity,
      'options', c.reloptions
    ) ORDER BY c.relname)
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
  ),
  'columns', (
    SELECT jsonb_agg(jsonb_build_object(
      'table', table_name, 'name', column_name, 'type', udt_name,
      'nullable', is_nullable, 'default_md5', md5(column_default)
    ) ORDER BY table_name, ordinal_position)
    FROM information_schema.columns WHERE table_schema = 'public'
  ),
  'functions', (
    SELECT jsonb_agg(jsonb_build_object(
      'name', p.proname, 'args', pg_get_function_identity_arguments(p.oid),
      'result', pg_get_function_result(p.oid), 'security_definer', p.prosecdef,
      'config', p.proconfig, 'definition_md5', md5(pg_get_functiondef(p.oid)),
      'anon_execute', has_function_privilege('anon', p.oid, 'EXECUTE'),
      'authenticated_execute', has_function_privilege('authenticated', p.oid, 'EXECUTE')
    ) ORDER BY p.proname, p.oid)
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p')
  ),
  'policies', (
    SELECT jsonb_agg(jsonb_build_object(
      'table', tablename, 'name', policyname, 'roles', roles, 'command', cmd,
      'using_md5', md5(qual), 'check_md5', md5(with_check)
    ) ORDER BY tablename, policyname)
    FROM pg_policies WHERE schemaname IN ('public', 'storage')
  ),
  'constraints', (
    SELECT jsonb_agg(jsonb_build_object(
      'table', c.relname, 'name', co.conname, 'type', co.contype,
      'definition', pg_get_constraintdef(co.oid)
    ) ORDER BY c.relname, co.conname)
    FROM pg_constraint co JOIN pg_class c ON c.oid = co.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public'
  ),
  'triggers', (
    SELECT jsonb_agg(jsonb_build_object(
      'table', c.relname, 'name', t.tgname,
      'enabled', t.tgenabled, 'definition_md5', md5(pg_get_triggerdef(t.oid))
    ) ORDER BY c.relname, t.tgname)
    FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('public', 'auth') AND NOT t.tgisinternal
  ),
  'buckets', (
    SELECT jsonb_agg(jsonb_build_object(
      'id', b.id, 'public', b.public, 'file_size_limit', b.file_size_limit,
      'allowed_mime_types', b.allowed_mime_types,
      'object_count', (SELECT count(*) FROM storage.objects o WHERE o.bucket_id = b.id)
    ) ORDER BY b.id) FROM storage.buckets b
  ),
  'totals', jsonb_build_object(
    'auth_users', (SELECT count(*) FROM auth.users),
    'profiles', (SELECT count(*) FROM public.profiles),
    'auth_without_profile', (SELECT count(*) FROM auth.users u WHERE NOT EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.user_id = u.id)),
    'orders', (SELECT count(*) FROM public.sicoob_orders),
    'quotes', (SELECT count(*) FROM public.quotes)
  )
) AS inventario;
ROLLBACK;
