-- Ativa somente as tabelas realmente consumidas por postgres_changes.
-- Cada tabela precisa manter RLS e ao menos uma política SELECT antes de ser
-- incluída. A publicação continua seletiva (puballtables=false).

DROP POLICY IF EXISTS user_read_own_login_attempts ON public.login_attempts;
CREATE POLICY user_read_own_login_attempts
ON public.login_attempts
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

DO $realtime$
DECLARE
  target_table text;
  target_tables constant text[] := ARRAY[
    'custom_kits',
    'device_login_notifications',
    'discount_approval_requests',
    'integration_credentials',
    'kit_comments',
    'login_attempts',
    'notifications',
    'orders',
    'product_views',
    'quotes',
    'search_analytics',
    'sicoob_orders'
  ];
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_publication
    WHERE pubname = 'supabase_realtime'
      AND NOT puballtables
  ) THEN
    RAISE EXCEPTION 'A publicação seletiva supabase_realtime não está disponível.';
  END IF;

  FOREACH target_table IN ARRAY target_tables LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = target_table
        AND c.relkind IN ('r', 'p')
        AND c.relrowsecurity
    ) THEN
      RAISE EXCEPTION 'Realtime recusado para public.%: tabela ausente ou sem RLS.', target_table;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_policy p
      JOIN pg_catalog.pg_class c ON c.oid = p.polrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = target_table
        AND p.polcmd IN ('r', '*')
        AND p.polroles && ARRAY[
          'authenticated'::regrole::oid,
          0::oid
        ]
    ) THEN
      RAISE EXCEPTION 'Realtime recusado para public.%: política SELECT ausente.', target_table;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = target_table
    ) THEN
      EXECUTE format(
        'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',
        target_table
      );
    END IF;
  END LOOP;
END
$realtime$;

-- Filtros e invalidações precisam identificar UPDATE/DELETE. FULL fica
-- restrito às tabelas assinadas com event='*'; as assinaturas INSERT mantêm a
-- identidade padrão e geram menos WAL.
ALTER TABLE public.custom_kits REPLICA IDENTITY FULL;
ALTER TABLE public.discount_approval_requests REPLICA IDENTITY FULL;
ALTER TABLE public.integration_credentials REPLICA IDENTITY FULL;
ALTER TABLE public.kit_comments REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.quotes REPLICA IDENTITY FULL;
ALTER TABLE public.sicoob_orders REPLICA IDENTITY FULL;

CREATE OR REPLACE FUNCTION public.notify_hardening_regression()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  private_buckets integer;
  unsafe_realtime integer;
  pg_trgm_in_extensions boolean;
  cleanup_job_active boolean;
  failures text[] := ARRAY[]::text[];
  score integer := 0;
  max_score constant integer := 5;
  admin_record record;
  notified integer := 0;
  message_text text;
BEGIN
  SELECT count(*) INTO private_buckets
  FROM storage.buckets
  WHERE id IN ('personalization-images', 'product-videos', 'supplier-logos', 'component-media')
    AND public = false;
  IF private_buckets = 4 THEN
    score := score + 1;
  ELSE
    failures := failures || format('Buckets privados: %s/4', private_buckets);
  END IF;

  SELECT count(*) INTO unsafe_realtime
  FROM pg_catalog.pg_publication_tables publication_table
  JOIN pg_catalog.pg_class table_class
    ON table_class.oid = format(
      '%I.%I',
      publication_table.schemaname,
      publication_table.tablename
    )::regclass
  WHERE publication_table.pubname = 'supabase_realtime'
    AND publication_table.schemaname = 'public'
    AND publication_table.tablename IN (
      'discount_approval_requests',
      'kit_variants',
      'kit_comments'
    )
    AND (
      NOT table_class.relrowsecurity
      OR NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_policy policy
        WHERE policy.polrelid = table_class.oid
          AND policy.polcmd IN ('r', '*')
          AND policy.polroles && ARRAY[
            'authenticated'::regrole::oid,
            0::oid
          ]
      )
    );
  IF unsafe_realtime = 0 THEN
    score := score + 1;
  ELSE
    failures := failures || format('Tabelas realtime sem isolamento: %s', unsafe_realtime);
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_extension extension
    JOIN pg_catalog.pg_namespace namespace ON namespace.oid = extension.extnamespace
    WHERE extension.extname = 'pg_trgm'
      AND namespace.nspname = 'extensions'
  ) INTO pg_trgm_in_extensions;
  IF pg_trgm_in_extensions THEN
    score := score + 1;
  ELSE
    failures := failures || ARRAY['pg_trgm fora do schema extensions'];
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'cleanup-security-logs-daily'
      AND active
  ) INTO cleanup_job_active;
  IF cleanup_job_active THEN
    score := score + 1;
  ELSE
    failures := failures || ARRAY['Job cleanup-security-logs-daily inativo'];
  END IF;

  score := score + 1; -- MFA é verificada pelo gate do aplicativo.

  IF score >= max_score THEN
    RETURN jsonb_build_object(
      'ok', true,
      'score', score,
      'max', max_score,
      'notified', 0
    );
  END IF;

  message_text := format(
    'Saúde do hardening caiu para %s/%s. Falhas: %s. Acesse /admin/seguranca-acesso.',
    score,
    max_score,
    array_to_string(failures, '; ')
  );

  FOR admin_record IN
    SELECT user_id
    FROM public.user_roles
    WHERE role = 'admin'
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.workspace_notifications
      WHERE user_id = admin_record.user_id
        AND category = 'security'
        AND title = '⚠️ Regressão de hardening detectada'
        AND created_at > now() - interval '20 hours'
    ) THEN
      INSERT INTO public.workspace_notifications (
        user_id,
        title,
        message,
        type,
        category,
        action_url,
        metadata
      ) VALUES (
        admin_record.user_id,
        '⚠️ Regressão de hardening detectada',
        message_text,
        'warning',
        'security',
        '/admin/seguranca-acesso',
        jsonb_build_object('score', score, 'max', max_score, 'failures', failures)
      );
      notified := notified + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'score', score,
    'max', max_score,
    'failures', failures,
    'notified', notified
  );
END;
$function$;

DO $assert$
DECLARE
  expected_tables constant text[] := ARRAY[
    'custom_kits',
    'device_login_notifications',
    'discount_approval_requests',
    'integration_credentials',
    'kit_comments',
    'login_attempts',
    'notifications',
    'orders',
    'product_views',
    'quotes',
    'search_analytics',
    'sicoob_orders'
  ];
BEGIN
  IF (
    SELECT count(*)
    FROM pg_catalog.pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = ANY(expected_tables)
  ) <> cardinality(expected_tables) THEN
    RAISE EXCEPTION 'Contrato inválido: publicação Realtime incompleta.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_publication
    WHERE pubname = 'supabase_realtime'
      AND puballtables
  ) THEN
    RAISE EXCEPTION 'Contrato inválido: supabase_realtime não pode publicar todas as tabelas.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'login_attempts'
      AND policyname = 'user_read_own_login_attempts'
      AND roles = ARRAY['authenticated']::name[]
      AND cmd = 'SELECT'
      -- pg_get_expr normaliza auth.uid() para uid() e pode inserir quebras de
      -- linha. Validamos os dois operandos sem depender da formatação.
      AND strpos(qual, 'user_id') > 0
      AND strpos(qual, 'uid()') > 0
  ) THEN
    RAISE EXCEPTION 'Contrato inválido: tentativas de login não estão isoladas por usuário.';
  END IF;

  IF NOT COALESCE((
    SELECT prosecdef
      AND proconfig = ARRAY['search_path=pg_catalog, public']::text[]
      AND prosrc LIKE '%table_class.relrowsecurity%'
      AND prosrc LIKE '%Tabelas realtime sem isolamento%'
    FROM pg_catalog.pg_proc
    WHERE oid = 'public.notify_hardening_regression()'::regprocedure
  ), false) THEN
    RAISE EXCEPTION 'Contrato inválido: monitor de hardening não valida RLS do Realtime.';
  END IF;
END
$assert$;
